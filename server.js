"use strict";

const Hapi = require("@hapi/hapi");
const Inert = require("@hapi/inert");
const fs = require("fs-extra");
const path = require("path");
const crypto = require("crypto");
const yauzl = require("yauzl");
const sqlite3 = require("sqlite3").verbose();
const { v4: uuidv4 } = require("uuid");
const axios = require("axios");
const archiver = require("archiver"); // Diperlukan untuk membuat ZIP

// --- Konfigurasi Path ---
const UPLOADS_DIR = path.join(__dirname, "uploads");
const TEMP_EXTRACT_DIR_BASE = path.join(__dirname, "temp_extract");
const MODELS_DIR = path.join(__dirname, "models");
const DETECTION_MODEL_DIR = path.join(MODELS_DIR, "detection");
const RECOMMENDATION_MODEL_DIR = path.join(MODELS_DIR, "recommendation");
const RECOMMENDATION_SCALERS_DIR = path.join(
  RECOMMENDATION_MODEL_DIR,
  "scalers"
);
const RECOMMENDATION_METADATA_DIR = path.join(
  RECOMMENDATION_MODEL_DIR,
  "metadata"
);
const TRAINING_UPLOADS_DIR = path.join(__dirname, "training_uploads");
const TRAINING_ZIPS_DIR = path.join(__dirname, "training_zips"); // Direktori untuk menyimpan ZIP dataset
const CONFIG_DIR = path.join(__dirname, "config_data");
const CONFIG_FILE = path.join(CONFIG_DIR, "app_config.json");
const CREDENTIALS_FILE = path.join(CONFIG_DIR, "service-account-key.json");
const DB_FILE = path.join(__dirname, "database.sqlite");

// --- Inisialisasi Database SQLite ---
const db = new sqlite3.Database(DB_FILE, (err) => {
  if (err) {
    console.error("Gagal membuka database SQLite", err.message);
    throw err;
  }
  console.log("Terhubung ke database SQLite.");
  db.serialize(() => {
    db.run(
      `CREATE TABLE IF NOT EXISTS training_images (
            id TEXT PRIMARY KEY,
            filename TEXT NOT NULL,
            foodName TEXT NOT NULL,
            description TEXT,
            imageUrl TEXT NOT NULL,
            isUsed BOOLEAN DEFAULT FALSE,
            uploadedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
      (err) => {
        if (err)
          console.error("Gagal membuat tabel training_images:", err.message);
        else console.log("Tabel training_images siap.");
      }
    );
  });
});

// --- Fungsi Utilitas ---
const ensureDirExists = async (dirPath) => {
  try {
    await fs.ensureDir(dirPath);
    // console.log(`Direktori dipastikan ada: ${dirPath}`);
  } catch (err) {
    console.error(`Gagal memastikan direktori ${dirPath}:`, err);
    throw err;
  }
};

const getDefaultAppConfig = async () => ({
  gasUrl: "",
  masterSpreadsheetUrl:
    "https://docs.google.com/spreadsheets/d/1ty-gYvSoimFzppLZzQuNnWyr-xnNMsjVEnrL7WA9EAY/edit#gid=2081427701",
  serviceAccountKeyExists: await fs.pathExists(CREDENTIALS_FILE),
  isGasAuthRequired: false,
});

const readAppConfig = async () => {
  try {
    await ensureDirExists(CONFIG_DIR);
    if (!(await fs.pathExists(CONFIG_FILE))) {
      const defaultConfig = await getDefaultAppConfig();
      await fs.writeFile(
        CONFIG_FILE,
        JSON.stringify(defaultConfig, null, 2),
        "utf8"
      );
      return defaultConfig;
    }
    const data = await fs.readFile(CONFIG_FILE, "utf8");
    const config = { ...(await getDefaultAppConfig()), ...JSON.parse(data) };
    config.serviceAccountKeyExists = await fs.pathExists(CREDENTIALS_FILE);
    return config;
  } catch (error) {
    console.warn(
      "Gagal membaca app_config.json, mengembalikan default.",
      error.message
    );
    return await getDefaultAppConfig();
  }
};

const writeAppConfig = async (newConfigDataFromClient) => {
  try {
    await ensureDirExists(CONFIG_DIR);
    const currentConfig = await readAppConfig();
    const updatedConfig = {
      ...currentConfig,
      gasUrl:
        typeof newConfigDataFromClient.gasUrl === "string"
          ? newConfigDataFromClient.gasUrl
          : currentConfig.gasUrl,
      masterSpreadsheetUrl:
        typeof newConfigDataFromClient.masterSpreadsheetUrl === "string"
          ? newConfigDataFromClient.masterSpreadsheetUrl
          : currentConfig.masterSpreadsheetUrl,
      isGasAuthRequired:
        typeof newConfigDataFromClient.isGasAuthRequired === "boolean"
          ? newConfigDataFromClient.isGasAuthRequired
          : currentConfig.isGasAuthRequired,
      serviceAccountKeyExists: await fs.pathExists(CREDENTIALS_FILE),
    };
    await fs.writeFile(
      CONFIG_FILE,
      JSON.stringify(updatedConfig, null, 2),
      "utf8"
    );
    console.log("Konfigurasi aplikasi berhasil disimpan.");
    return {
      success: true,
      message: "Konfigurasi aplikasi berhasil disimpan.",
      ...updatedConfig,
    };
  } catch (error) {
    console.error("Gagal menulis ke app_config.json:", error);
    throw new Error("Gagal menyimpan file konfigurasi di server.");
  }
};

const calculateHashForFile = async (filePath) => {
  try {
    if (!(await fs.pathExists(filePath))) {
      // console.warn(`File tidak ditemukan untuk hashing: ${filePath}`);
      return "N/A (File tidak ditemukan)";
    }
    const fileBuffer = await fs.readFile(filePath);
    const hash = crypto.createHash("sha256");
    hash.update(fileBuffer);
    return hash.digest("hex");
  } catch (error) {
    console.error(`Error calculating hash for file ${filePath}:`, error);
    return "Error Hashing File";
  }
};

const calculateDirectoryHash = async (directory, excludeFiles = []) => {
  try {
    if (
      !(await fs.pathExists(directory)) ||
      (await fs.readdir(directory)).length === 0
    ) {
      // console.warn(`Direktori kosong atau tidak ditemukan untuk hashing: ${directory}`);
      return "N/A (Direktori Kosong atau Tidak Ditemukan)";
    }

    const filesAndDirs = await fs.readdir(directory);
    const filesToHash = [];
    for (const item of filesAndDirs) {
      const itemPath = path.join(directory, item);
      if ((await fs.stat(itemPath)).isFile()) {
        if (
          !excludeFiles.map((f) => f.toLowerCase()).includes(item.toLowerCase())
        ) {
          filesToHash.push(item);
        }
      }
    }
    filesToHash.sort();

    if (filesToHash.length === 0) {
      // console.warn(`Tidak ada file inti untuk di-hash di direktori: ${directory} (setelah eksklusi)`);
      return "N/A (Tidak ada file model inti setelah eksklusi)";
    }

    const hash = crypto.createHash("sha256");
    for (const file of filesToHash) {
      const filePath = path.join(directory, file);
      if ((await fs.stat(filePath)).isFile()) {
        hash.update(await fs.readFile(filePath));
      }
    }
    return hash.digest("hex");
  } catch (error) {
    console.error(`Error calculating hash for directory ${directory}:`, error);
    return "Error Hashing Directory";
  }
};

const findModelJson = async (currentPath, baseExtractDir) => {
  const entries = await fs.readdir(currentPath, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(currentPath, entry.name);
    if (entry.isDirectory()) {
      const found = await findModelJson(entryPath, baseExtractDir);
      if (found) return found;
    } else if (entry.name.toLowerCase() === "model.json") {
      return path.relative(baseExtractDir, entryPath);
    }
  }
  return null;
};

const extractZip = (zipFilePath, destinationPath) => {
  return new Promise((resolve, reject) => {
    // console.log(`Mulai ekstraksi ZIP: ${zipFilePath} ke ${destinationPath}`);
    yauzl.open(zipFilePath, { lazyEntries: true }, (err, zipfile) => {
      if (err) {
        console.error(`Error membuka ZIP file ${zipFilePath}:`, err);
        return reject(err);
      }
      zipfile.readEntry();
      zipfile.on("entry", (entry) => {
        const entryDestinationPath = path.join(destinationPath, entry.fileName);
        // console.log(`Ekstrak entry: ${entry.fileName}`);
        if (/\/$/.test(entry.fileName)) {
          fs.ensureDir(entryDestinationPath)
            .then(() => zipfile.readEntry())
            .catch(reject);
        } else {
          fs.ensureDir(path.dirname(entryDestinationPath))
            .then(() => {
              zipfile.openReadStream(entry, (err, readStream) => {
                if (err) {
                  console.error(
                    `Error membuka read stream untuk entry ${entry.fileName}:`,
                    err
                  );
                  return reject(err);
                }
                const writeStream = fs.createWriteStream(entryDestinationPath);
                readStream.pipe(writeStream);
                writeStream.on("finish", () => {
                  // console.log(`Selesai menulis file: ${entryDestinationPath}`);
                  zipfile.readEntry();
                });
                writeStream.on("error", (writeErr) => {
                  console.error(
                    `Error menulis file ${entryDestinationPath}:`,
                    writeErr
                  );
                  reject(writeErr);
                });
                readStream.on("error", (readErr) => {
                  console.error(
                    `Error membaca stream untuk ${entry.fileName}:`,
                    readErr
                  );
                  reject(readErr);
                });
              });
            })
            .catch(reject);
        }
      });
      zipfile.on("end", () => {
        // console.log(`Ekstraksi ZIP ${zipFilePath} selesai.`);
        resolve();
      });
      zipfile.on("error", (zipErr) => {
        console.error(`Error selama proses ZIP ${zipFilePath}:`, zipErr);
        reject(zipErr);
      });
    });
  });
};

// --- Inisialisasi Server Hapi ---
const init = async () => {
  await Promise.all([
    ensureDirExists(UPLOADS_DIR),
    ensureDirExists(TEMP_EXTRACT_DIR_BASE),
    ensureDirExists(MODELS_DIR),
    ensureDirExists(DETECTION_MODEL_DIR),
    ensureDirExists(RECOMMENDATION_MODEL_DIR),
    ensureDirExists(RECOMMENDATION_SCALERS_DIR),
    ensureDirExists(RECOMMENDATION_METADATA_DIR),
    ensureDirExists(TRAINING_UPLOADS_DIR),
    ensureDirExists(TRAINING_ZIPS_DIR), // Pastikan direktori ZIP ada
    ensureDirExists(CONFIG_DIR),
  ]);

  const server = Hapi.server({
    port: 3000,
    host: "0.0.0.0",
    routes: {
      cors: { origin: ["*"], credentials: true },
      payload: {
        output: "stream",
        parse: true,
        multipart: { output: "stream" },
      },
    },
  });
  await server.register(Inert);

  // --- Rute Konfigurasi Aplikasi ---
  server.route({
    method: "GET",
    path: "/api/config",
    handler: async (request, h) => {
      try {
        return h.response(await readAppConfig()).code(200);
      } catch (e) {
        console.error("Error GET /api/config:", e);
        return h
          .response({ error: "Gagal mendapatkan konfigurasi aplikasi" })
          .code(500);
      }
    },
  });

  server.route({
    method: "POST",
    path: "/api/config",
    options: {
      payload: { output: "data", parse: true, allow: "application/json" },
    },
    handler: async (request, h) => {
      const receivedConfig = request.payload;
      if (
        !receivedConfig ||
        typeof receivedConfig.gasUrl !== "string" ||
        typeof receivedConfig.masterSpreadsheetUrl !== "string" ||
        typeof receivedConfig.isGasAuthRequired !== "boolean"
      ) {
        console.error(
          "Validasi gagal untuk POST /api/config. Payload:",
          receivedConfig
        );
        return h
          .response({
            error: "Data konfigurasi tidak valid atau field wajib hilang.",
          })
          .code(400);
      }
      try {
        const savedConfig = await writeAppConfig(receivedConfig);
        return h.response(savedConfig).code(200);
      } catch (e) {
        console.error("Error POST /api/config:", e);
        return h
          .response({
            error: e.message || "Gagal menyimpan konfigurasi aplikasi",
          })
          .code(500);
      }
    },
  });

  // --- Rute Credentials Service Account ---
  server.route({
    method: "POST",
    path: "/api/config/credentials",
    options: {
      payload: {
        output: "stream",
        parse: true,
        multipart: true,
        maxBytes: 2 * 1024 * 1024,
      },
    },
    handler: async (request, h) => {
      const data = request.payload;
      if (
        !data.credentialsFile ||
        !data.credentialsFile.hapi ||
        !data.credentialsFile.hapi.filename
      ) {
        return h
          .response({
            error: "File credentials tidak valid atau tidak ditemukan.",
          })
          .code(400);
      }
      const credentialsFile = data.credentialsFile;
      if (!credentialsFile.hapi.filename.toLowerCase().endsWith(".json")) {
        return h
          .response({
            error: "Hanya file .json yang diizinkan untuk credentials.",
          })
          .code(400);
      }
      try {
        await ensureDirExists(CONFIG_DIR);
        await new Promise((resolve, reject) => {
          const fileStream = fs.createWriteStream(CREDENTIALS_FILE);
          credentialsFile.pipe(fileStream);
          credentialsFile.on("error", reject);
          fileStream.on("finish", resolve);
          fileStream.on("error", reject);
        });
        console.log(`File credentials disimpan: ${CREDENTIALS_FILE}`);
        await writeAppConfig({});
        return h
          .response({ message: "File credentials berhasil diunggah." })
          .code(200);
      } catch (err) {
        console.error("Error saat mengunggah file credentials:", err);
        return h
          .response({
            error: `Gagal mengunggah file credentials: ${err.message}`,
          })
          .code(500);
      }
    },
  });

  server.route({
    method: "GET",
    path: "/api/config/credentials-status",
    handler: async (request, h) => {
      try {
        const exists = await fs.pathExists(CREDENTIALS_FILE);
        let lastModified = null;
        if (exists) {
          const stats = await fs.stat(CREDENTIALS_FILE);
          lastModified = stats.mtime;
        }
        return h
          .response({ exists: exists, lastModified: lastModified })
          .code(200);
      } catch (err) {
        console.error("Error memeriksa status credentials:", err);
        return h
          .response({ error: "Gagal memeriksa status file credentials." })
          .code(500);
      }
    },
  });

  server.route({
    method: "DELETE",
    path: "/api/config/credentials",
    handler: async (request, h) => {
      try {
        if (await fs.pathExists(CREDENTIALS_FILE)) {
          await fs.remove(CREDENTIALS_FILE);
          console.log(`File credentials dihapus: ${CREDENTIALS_FILE}`);
          await writeAppConfig({});
          return h
            .response({ message: "File credentials berhasil dihapus." })
            .code(200);
        } else {
          return h
            .response({
              message: "File credentials tidak ditemukan untuk dihapus.",
            })
            .code(200);
        }
      } catch (err) {
        console.error("Error menghapus file credentials:", err);
        return h
          .response({
            error: `Gagal menghapus file credentials: ${err.message}`,
          })
          .code(500);
      }
    },
  });

  // --- Rute Data Spreadsheet ---
  const SPREADSHEET_COLUMNS_CLIENT = {
    Scrap_Food_Name_List: ["name", "label"],
    Cache_Food_Name_List: [
      "cache_key",
      "sumber",
      "ukuran_porsi",
      "kalori (kkal)",
      "energi (kj)",
      "lemak (g)",
      "lemak jenuh (g)",
      "lemak tak jenuh ganda (g)",
      "lemak tak jenuh tunggal (g)",
      "kolesterol (mg)",
      "protein (g)",
      "karbohidrat (g)",
      "serat (g)",
      "gula (g)",
      "sodium (mg)",
      "kalium (mg)",
      "porsi_lainnya (kalori)",
    ],
    Result_Food_Name_List: [
      "nama_makanan",
      "label",
      "sumber",
      "ukuran_porsi",
      "kalori (kkal)",
      "energi (kj)",
      "lemak (g)",
      "lemak jenuh (g)",
      "lemak tak jenuh ganda (g)",
      "lemak tak jenuh tunggal (g)",
      "kolesterol (mg)",
      "protein (g)",
      "karbohidrat (g)",
      "serat (g)",
      "gula (g)",
      "sodium (mg)",
      "kalium (mg)",
      "porsi_lainnya (kalori)",
    ],
  };

  const callGasForSheetData = async (
    action,
    sheetNameOrFoodName,
    payloadData = null,
    rowIdentifier = null
  ) => {
    const appConfig = await readAppConfig();
    if (!appConfig.gasUrl)
      throw new Error("URL Google Apps Script belum dikonfigurasi.");

    const gasRequestPayload = { action: action };

    if (action === "get_food_nutrition_by_name") {
      gasRequestPayload.foodName = sheetNameOrFoodName;
    } else {
      gasRequestPayload.sheet = sheetNameOrFoodName;
      if (action === "create" || action === "update") {
        if (
          !payloadData ||
          !payloadData.rowData ||
          !Array.isArray(payloadData.rowData)
        ) {
          console.error(
            `[HAPI ERROR] callGasForSheetData: Untuk aksi '${action}', rowData wajib. Diterima:`,
            payloadData
          );
          throw new Error(
            `Untuk aksi '${action}', data baris (rowData) wajib dan harus array.`
          );
        }
        gasRequestPayload.rowData = payloadData.rowData;
      }
      if (rowIdentifier !== null) {
        gasRequestPayload.rowIndex = rowIdentifier;
      }
    }

    // console.log(`[HAPI LOG] Memanggil GAS (via Axios): URL: ${appConfig.gasUrl}, Payload: ${JSON.stringify(gasRequestPayload)}`);

    try {
      const response = await axios({
        method: "post",
        url: appConfig.gasUrl,
        headers: { "Content-Type": "application/json" },
        data: gasRequestPayload,
      });

      const contentType = response.headers["content-type"];
      if (contentType && contentType.includes("application/json")) {
        if (response.data && response.data.error) {
          console.error(
            "[HAPI ERROR] Error dari GAS App (dalam JSON):",
            response.data.error,
            "Detail:",
            response.data.data ? response.data.data.details : "Tidak ada detail"
          );
          throw new Error(
            `GAS App Error (Code ${response.data.code || "N/A"}): ${
              response.data.error
            } - ${
              response.data.data && response.data.data.details
                ? response.data.data.details
                : ""
            }`
          );
        }
        if (response.data && response.data.code && response.data.code >= 400) {
          console.error(
            "[HAPI ERROR] Error dari GAS App (kode status dalam JSON):",
            response.data.code,
            "Pesan:",
            response.data.data
              ? response.data.data.message
              : response.data.error || "Tidak ada pesan error spesifik"
          );
          const gasErrorMsg =
            response.data.data && response.data.data.message
              ? response.data.data.message
              : response.data.error ||
                `GAS mengembalikan kode ${response.data.code}`;
          throw new Error(gasErrorMsg);
        }
        return response.data.data;
      } else {
        console.warn(
          "[HAPI WARNING] GAS tidak mengembalikan JSON (via Axios). Status:",
          response.status,
          "Respons:",
          typeof response.data === "string"
            ? response.data.substring(0, 500)
            : response.data
        );
        throw new Error(
          "GAS tidak mengembalikan respons JSON yang valid (via Axios). Periksa URL GAS dan mode deployment."
        );
      }
    } catch (error) {
      if (error.response) {
        console.error(
          "[HAPI ERROR] Error dari GAS (Axios Response Error): Status:",
          error.response.status,
          "Data:",
          typeof error.response.data === "string"
            ? error.response.data.substring(0, 500)
            : error.response.data
        );
        if ([301, 302, 307].includes(error.response.status)) {
          throw new Error(
            `GAS redirect ke ${
              error.response.headers.location || "lokasi tidak diketahui"
            }, bukan JSON. Periksa URL GAS dan mode deployment.`
          );
        }
        let gasErrorMessage = "Unknown GAS error";
        if (error.response.data && error.response.data.error) {
          gasErrorMessage = error.response.data.error;
          if (error.response.data.data && error.response.data.data.details)
            gasErrorMessage += ` - ${error.response.data.data.details}`;
        } else if (
          error.response.data &&
          error.response.data.data &&
          error.response.data.data.message
        ) {
          gasErrorMessage = error.response.data.data.message;
        } else if (typeof error.response.data === "string") {
          const matchTitle = error.response.data.match(
            /<title>(.*?)<\/title>/i
          );
          gasErrorMessage =
            matchTitle && matchTitle[1]
              ? matchTitle[1]
              : error.response.data.substring(0, 200);
        } else if (
          typeof error.response.data === "object" &&
          error.response.data !== null
        ) {
          gasErrorMessage = JSON.stringify(error.response.data);
        }
        throw new Error(
          `GAS Error (${error.response.status}): ${gasErrorMessage}`
        );
      } else if (error.request) {
        console.error(
          "[HAPI ERROR] Error dari GAS (Axios Request Error - No Response):",
          error.message
        );
        throw new Error(
          "Tidak ada respons dari GAS. Cek koneksi atau URL GAS."
        );
      } else {
        console.error(
          "[HAPI ERROR] Error (Axios Setup Error atau error dari throw di atas):",
          error.message
        );
        throw error;
      }
    }
  };

  // --- Rute CRUD Spreadsheet ---
  server.route({
    method: "GET",
    path: "/api/sheet-data/{sheetName}",
    handler: async (r, h) => {
      try {
        return h
          .response({
            data: await callGasForSheetData("read", r.params.sheetName),
          })
          .code(200);
      } catch (err) {
        console.error(
          `[HAPI ERROR] Gagal GET /api/sheet-data/${r.params.sheetName}:`,
          err.message
        );
        return h.response({ error: err.message }).code(500);
      }
    },
  });
  server.route({
    method: "POST",
    path: "/api/sheet-data/{sheetName}",
    options: {
      payload: { output: "data", parse: true, allow: "application/json" },
    },
    handler: async (r, h) => {
      try {
        const res = await callGasForSheetData(
          "create",
          r.params.sheetName,
          r.payload
        );
        return h
          .response({
            message: "Data berhasil ditambahkan via GAS.",
            status: "success",
            gasResponse: res,
          })
          .code(201);
      } catch (err) {
        console.error(
          `[HAPI ERROR] Gagal POST /api/sheet-data/${r.params.sheetName}:`,
          err.message
        );
        return h.response({ error: err.message }).code(500);
      }
    },
  });
  server.route({
    method: "PUT",
    path: "/api/sheet-data/{sheetName}/{rowIdentifier}",
    options: {
      payload: { output: "data", parse: true, allow: "application/json" },
    },
    handler: async (r, h) => {
      try {
        const res = await callGasForSheetData(
          "update",
          r.params.sheetName,
          r.payload,
          r.params.rowIdentifier
        );
        return h
          .response({
            message: "Data berhasil diperbarui via GAS.",
            status: "success",
            gasResponse: res,
          })
          .code(200);
      } catch (err) {
        console.error(
          `[HAPI ERROR] Gagal PUT /api/sheet-data/${r.params.sheetName}/${r.params.rowIdentifier}:`,
          err.message
        );
        return h.response({ error: err.message }).code(500);
      }
    },
  });
  server.route({
    method: "DELETE",
    path: "/api/sheet-data/{sheetName}/{rowIdentifier}",
    handler: async (r, h) => {
      try {
        const res = await callGasForSheetData(
          "delete",
          r.params.sheetName,
          null,
          r.params.rowIdentifier
        );
        return h
          .response({
            message: "Data berhasil dihapus via GAS.",
            status: "success",
            gasResponse: res,
          })
          .code(200);
      } catch (err) {
        console.error(
          `[HAPI ERROR] Gagal DELETE /api/sheet-data/${r.params.sheetName}/${r.params.rowIdentifier}:`,
          err.message
        );
        return h.response({ error: err.message }).code(500);
      }
    },
  });

  // --- Rute untuk Informasi Gizi Makanan ---
  server.route({
    method: "GET",
    path: "/api/food-nutrition/{foodName}",
    handler: async (request, h) => {
      const foodName = decodeURIComponent(request.params.foodName);
      // console.log(`[HAPI LOG] Menerima permintaan info gizi untuk: ${foodName}`);
      try {
        const nutritionData = await callGasForSheetData(
          "get_food_nutrition_by_name",
          foodName
        );
        if (
          nutritionData &&
          Object.keys(nutritionData).length > 0 &&
          !nutritionData.message
        ) {
          return h
            .response({ status: "success", data: nutritionData })
            .code(200);
        } else {
          const message =
            nutritionData && nutritionData.message
              ? nutritionData.message
              : `Makanan '${foodName}' tidak ditemukan.`;
          // console.log(`[HAPI LOG] Info gizi tidak ditemukan untuk: ${foodName}. Pesan: ${message}`);
          return h
            .response({ status: "not_found", message: message })
            .code(404);
        }
      } catch (err) {
        console.error(
          `[HAPI ERROR] Gagal mengambil info gizi untuk '${foodName}':`,
          err.message
        );
        if (
          err.message &&
          err.message.toLowerCase().includes("tidak ditemukan")
        ) {
          return h
            .response({ status: "not_found", error: err.message })
            .code(404);
        }
        return h
          .response({
            status: "error",
            error: `Gagal mengambil data gizi: ${err.message}`,
          })
          .code(500);
      }
    },
  });

  // --- Rute Statistik ---
  server.route({
    method: "GET",
    path: "/api/spreadsheet-stats",
    handler: async (request, h) => {
      // console.log("[HAPI LOG] Memulai pengambilan statistik jumlah baris (via Axios)...");
      const counts = {};
      for (const sheetName in SPREADSHEET_COLUMNS_CLIENT) {
        try {
          const dataFromGas = await callGasForSheetData("read", sheetName);
          counts[sheetName] =
            dataFromGas && Array.isArray(dataFromGas) && dataFromGas.length > 1
              ? dataFromGas.length - 1
              : 0;
        } catch (err) {
          console.error(
            `[HAPI ERROR] Gagal mengambil data untuk statistik sheet ${sheetName} (Axios):`,
            err.message
          );
          counts[sheetName] = "N/A";
        }
      }
      return h.response(counts).code(200);
    },
  });
  server.route({
    method: "GET",
    path: "/api/regional-nutrient-stats",
    handler: async (request, h) => {
      const sheetName = "Result_Food_Name_List";
      try {
        const resultDataFromGas = await callGasForSheetData("read", sheetName);
        if (
          !resultDataFromGas ||
          !Array.isArray(resultDataFromGas) ||
          resultDataFromGas.length <= 1
        )
          return h.response({ data: [] }).code(200);

        const headers = resultDataFromGas[0];
        const dataRows = resultDataFromGas.slice(1);

        const getIndex = (hN) => headers.indexOf(hN);
        const labelIndex = getIndex("label"),
          kaloriIndex = getIndex("kalori (kkal)"),
          proteinIndex = getIndex("protein (g)"),
          lemakIndex = getIndex("lemak (g)"),
          karboIndex = getIndex("karbohidrat (g)");

        if (
          [labelIndex, kaloriIndex, proteinIndex, lemakIndex, karboIndex].some(
            (idx) => idx === -1
          )
        )
          throw new Error(
            "Kolom nutrisi penting tidak ditemukan di sheet 'Result_Food_Name_List'."
          );

        const regionalData = {};
        const safePF = (v) =>
          isNaN(parseFloat(String(v).replace(",", ".")))
            ? 0
            : parseFloat(String(v).replace(",", "."));

        dataRows.forEach((row) => {
          if (!Array.isArray(row) || row.length < headers.length) return;
          let region = "Tidak Diketahui";
          const labelV = row[labelIndex];
          if (labelV && typeof labelV === "string") {
            const rM = labelV.match(/Region:\s*([^;]+)/i);
            if (rM && rM[1]) region = rM[1].trim();
          }
          if (!regionalData[region])
            regionalData[region] = {
              count: 0,
              kalori: 0,
              protein: 0,
              lemak: 0,
              karbo: 0,
            };
          regionalData[region].count++;
          regionalData[region].kalori += safePF(row[kaloriIndex]);
          regionalData[region].protein += safePF(row[proteinIndex]);
          regionalData[region].lemak += safePF(row[lemakIndex]);
          regionalData[region].karbo += safePF(row[karboIndex]);
        });

        const stats = Object.keys(regionalData)
          .map((r) => ({
            region: r,
            avgKalori: (regionalData[r].kalori / regionalData[r].count).toFixed(
              2
            ),
            avgProtein: (
              regionalData[r].protein / regionalData[r].count
            ).toFixed(2),
            avgLemak: (regionalData[r].lemak / regionalData[r].count).toFixed(
              2
            ),
            avgKarbo: (regionalData[r].karbo / regionalData[r].count).toFixed(
              2
            ),
            count: regionalData[r].count,
          }))
          .sort((a, b) => a.region.localeCompare(b.region));

        return h.response({ data: stats }).code(200);
      } catch (err) {
        console.error(
          "[HAPI ERROR] Error statistik gizi regional (Axios):",
          err
        );
        return h
          .response({ error: `Gagal statistik: ${err.message}` })
          .code(500);
      }
    },
  });

  // --- Rute Model & Gambar Latih ---
  const MODELS_DIR_RELATIVE_FOR_CLIENT = "tf_models";
  const TRAINING_IMAGES_RELATIVE_FOR_CLIENT = "training_images_serve";

  const handleModelAndLabelUpload = async (request, h, modelType) => {
    const data = request.payload;
    const modelFile = data.modelFile;
    const labelFile = data.labelFile;

    if (!modelFile || !modelFile.hapi || !modelFile.hapi.filename) {
      return h
        .response({
          error: "File model (.zip) tidak valid atau tidak ditemukan",
        })
        .code(400);
    }
    const originalModelFilename = modelFile.hapi.filename;
    if (!originalModelFilename.toLowerCase().endsWith(".zip")) {
      return h
        .response({ error: "Hanya file .zip yang diizinkan untuk model" })
        .code(400);
    }
    let originalLabelFilename = null;
    if (labelFile && labelFile.hapi && labelFile.hapi.filename) {
      originalLabelFilename = labelFile.hapi.filename;
      if (!originalLabelFilename.toLowerCase().endsWith(".json")) {
        return h
          .response({ error: "Hanya file .json yang diizinkan untuk label" })
          .code(400);
      }
    }
    const timestamp = Date.now();
    const tempZipFileName = `${timestamp}-${originalModelFilename}`;
    const tempZipPath = path.join(UPLOADS_DIR, tempZipFileName);
    const tempExtractDir = path.join(
      TEMP_EXTRACT_DIR_BASE,
      `${modelType}_${timestamp}_extract_${uuidv4()}`
    );
    const finalModelDir =
      modelType === "detection"
        ? DETECTION_MODEL_DIR
        : RECOMMENDATION_MODEL_DIR;

    try {
      await ensureDirExists(tempExtractDir);
      // console.log(`Menyimpan ZIP sementara ke: ${tempZipPath}`);
      await new Promise((resolve, reject) => {
        const fileStream = fs.createWriteStream(tempZipPath);
        modelFile.pipe(fileStream);
        modelFile.on("error", reject);
        fileStream.on("finish", resolve);
        fileStream.on("error", reject);
      });
      // console.log(`Membersihkan direktori model final: ${finalModelDir} dan ekstrak sementara: ${tempExtractDir}`);
      await fs.emptyDir(finalModelDir);
      await fs.emptyDir(tempExtractDir);
      // console.log(`Mengekstrak model dari ${tempZipPath} ke ${tempExtractDir}`);
      await extractZip(tempZipPath, tempExtractDir);
      const modelJsonRelativePath = await findModelJson(
        tempExtractDir,
        tempExtractDir
      );
      let sourceDirForCopy = tempExtractDir;
      if (modelJsonRelativePath) {
        const modelJsonDirInZip = path.dirname(modelJsonRelativePath);
        if (modelJsonDirInZip && modelJsonDirInZip !== ".") {
          sourceDirForCopy = path.join(tempExtractDir, modelJsonDirInZip);
        }
      } else {
        if (!(await fs.pathExists(path.join(tempExtractDir, "model.json")))) {
          const filesInExtract = await fs.readdir(tempExtractDir);
          const anyJsonFile = filesInExtract.find(
            (f) =>
              f.toLowerCase().endsWith(".json") &&
              f.toLowerCase().includes("model")
          );
          if (
            !anyJsonFile &&
            !filesInExtract.find(
              (f) =>
                f.toLowerCase().endsWith(".weights") ||
                f.toLowerCase().endsWith(".bin")
            )
          ) {
            throw new Error(
              "model.json atau file model inti tidak ditemukan di dalam file ZIP model."
            );
          }
          console.warn(
            "model.json tidak ditemukan secara spesifik, akan menyalin seluruh isi direktori ekstrak."
          );
        }
      }
      // console.log(`Menyalin dari ${sourceDirForCopy} ke ${finalModelDir}`);
      await fs.copy(sourceDirForCopy, finalModelDir, { overwrite: true });
      let labelMessage = "";
      if (labelFile && originalLabelFilename) {
        const finalLabelPath = path.join(finalModelDir, "label.json");
        if (await fs.pathExists(finalLabelPath))
          await fs.remove(finalLabelPath);
        await new Promise((resolve, reject) => {
          const labelFileStream = fs.createWriteStream(finalLabelPath);
          labelFile.pipe(labelFileStream);
          labelFile.on("error", reject);
          labelFileStream.on("finish", resolve);
          labelFileStream.on("error", reject);
        });
        labelMessage = " dan file label.json berhasil diunggah.";
        console.log(
          `File label.json disimpan untuk model ${modelType} di: ${finalLabelPath}`
        );
      }
      return h
        .response({
          message: `Model ${modelType} berhasil diunggah${labelMessage}`,
        })
        .code(200);
    } catch (err) {
      console.error(`[HAPI ERROR] Error upload model/label ${modelType}:`, err);
      return h
        .response({
          error: `Gagal mengunggah model/label ${modelType}: ${err.message}`,
        })
        .code(500);
    } finally {
      if (await fs.pathExists(tempZipPath)) {
        await fs
          .remove(tempZipPath)
          .catch((e) =>
            console.warn(`Gagal hapus zip sementara: ${tempZipPath}`, e)
          );
      }
      if (await fs.pathExists(tempExtractDir)) {
        await fs
          .remove(tempExtractDir)
          .catch((e) =>
            console.warn(
              `Gagal hapus direktori ekstrak sementara: ${tempExtractDir}`,
              e
            )
          );
      }
    }
  };

  const handleSingleAssetUpload = async (
    request,
    h,
    modelType,
    assetType,
    targetDir,
    targetFilename
  ) => {
    if (modelType !== "recommendation")
      return h
        .response({
          error: "Jenis model tidak didukung untuk unggah aset ini.",
        })
        .code(400);
    const data = request.payload;
    const assetFile = data.assetFile;
    if (!assetFile || !assetFile.hapi || !assetFile.hapi.filename)
      return h
        .response({
          error: `File aset (${assetType}) tidak valid atau tidak ditemukan.`,
        })
        .code(400);
    const finalAssetPath = path.join(targetDir, targetFilename);
    try {
      await ensureDirExists(targetDir);
      // console.log(`Menyimpan aset ${assetType} ke: ${finalAssetPath}`);
      await new Promise((resolve, reject) => {
        const fileStream = fs.createWriteStream(finalAssetPath);
        assetFile.pipe(fileStream);
        assetFile.on("error", reject);
        fileStream.on("finish", resolve);
        fileStream.on("error", reject);
      });
      const assetHash = await calculateHashForFile(finalAssetPath);
      // console.log(`Aset ${assetType} (${targetFilename}) berhasil diunggah. Hash: ${assetHash}`);
      return h
        .response({
          message: `Aset ${assetType} (${targetFilename}) berhasil diunggah.`,
          filePath: `/${MODELS_DIR_RELATIVE_FOR_CLIENT}/recommendation/${path.basename(
            targetDir
          )}/${targetFilename}`,
          version: assetHash,
        })
        .code(200);
    } catch (err) {
      console.error(
        `[HAPI ERROR] Error upload aset ${assetType} (${targetFilename}):`,
        err
      );
      return h
        .response({
          error: `Gagal mengunggah aset ${assetType}: ${err.message}`,
        })
        .code(500);
    }
  };

  const getModelInfo = async (request, h, modelType) => {
    const modelDir =
      modelType === "detection"
        ? DETECTION_MODEL_DIR
        : RECOMMENDATION_MODEL_DIR;
    const modelDirRelative = `${MODELS_DIR_RELATIVE_FOR_CLIENT}/${modelType}`;
    try {
      if (
        !(await fs.pathExists(modelDir)) ||
        (await fs.readdir(modelDir)).length === 0
      ) {
        return h
          .response({
            message: `Model ${modelType} belum diunggah atau direktori kosong.`,
            version: "N/A",
            modelJsonPath: "N/A",
            labelJsonPath: "N/A",
            labelJsonVersion: "N/A",
            scalerXVersion: "N/A",
            scalerXPath: "N/A",
            scalerYVersion: "N/A",
            scalerYPath: "N/A",
            metadataVersion: "N/A",
            metadataPath: "N/A",
          })
          .code(404);
      }
      const modelCoreVersion = await calculateDirectoryHash(modelDir, [
        "label.json",
        "scalers",
        "metadata",
      ]);
      const modelJsonServerPath = path.join(modelDir, "model.json");
      let modelJsonClientPath = "N/A";
      if (await fs.pathExists(modelJsonServerPath))
        modelJsonClientPath = `/${modelDirRelative}/model.json`.replace(
          /\\/g,
          "/"
        );
      else
        console.warn(
          `model.json tidak ditemukan untuk model ${modelType} di ${modelDir}`
        );
      const labelJsonServerPath = path.join(modelDir, "label.json");
      let labelJsonClientPath = "N/A",
        labelJsonVersion = "N/A";
      if (await fs.pathExists(labelJsonServerPath)) {
        labelJsonClientPath = `/${modelDirRelative}/label.json`.replace(
          /\\/g,
          "/"
        );
        labelJsonVersion = await calculateHashForFile(labelJsonServerPath);
      }
      let responsePayload = {
        modelType,
        version: modelCoreVersion,
        modelJsonPath: modelJsonClientPath,
        labelJsonPath: labelJsonClientPath,
        labelJsonVersion: labelJsonVersion,
        message: `Info model ${modelType} berhasil diambil.`,
      };
      if (modelType === "recommendation") {
        const scalerXPath = path.join(
          RECOMMENDATION_SCALERS_DIR,
          "scaler_x.pkl"
        );
        const scalerYPath = path.join(
          RECOMMENDATION_SCALERS_DIR,
          "scaler_y.pkl"
        );
        const metadataJsonPath = path.join(
          RECOMMENDATION_METADATA_DIR,
          "metadata.json"
        );

        responsePayload.scalerXVersion = await calculateHashForFile(
          scalerXPath
        );
        responsePayload.scalerXPath = (await fs.pathExists(scalerXPath))
          ? `/${modelDirRelative}/scalers/scaler_x.pkl`.replace(/\\/g, "/")
          : "N/A";

        responsePayload.scalerYVersion = await calculateHashForFile(
          scalerYPath
        );
        responsePayload.scalerYPath = (await fs.pathExists(scalerYPath))
          ? `/${modelDirRelative}/scalers/scaler_y.pkl`.replace(/\\/g, "/")
          : "N/A";

        responsePayload.metadataVersion = await calculateHashForFile(
          metadataJsonPath
        );
        responsePayload.metadataPath = (await fs.pathExists(metadataJsonPath))
          ? `/${modelDirRelative}/metadata/metadata.json`.replace(/\\/g, "/")
          : "N/A";
      }
      return h.response(responsePayload).code(200);
    } catch (err) {
      console.error(`[HAPI ERROR] Error GET info model ${modelType}:`, err);
      return h
        .response({ error: `Gagal mendapatkan info model: ${err.message}` })
        .code(500);
    }
  };

  server.route({
    method: "POST",
    path: "/api/upload/detection",
    handler: (r, h) => handleModelAndLabelUpload(r, h, "detection"),
    options: {
      payload: {
        output: "stream",
        parse: true,
        multipart: true,
        maxBytes: 200 * 1024 * 1024,
      },
    },
  });
  server.route({
    method: "POST",
    path: "/api/upload/recommendation",
    handler: (r, h) => handleModelAndLabelUpload(r, h, "recommendation"),
    options: {
      payload: {
        output: "stream",
        parse: true,
        multipart: true,
        maxBytes: 200 * 1024 * 1024,
      },
    },
  });
  server.route({
    method: "POST",
    path: "/api/upload/recommendation/scaler-x",
    handler: (r, h) =>
      handleSingleAssetUpload(
        r,
        h,
        "recommendation",
        "scaler X",
        RECOMMENDATION_SCALERS_DIR,
        "scaler_x.pkl"
      ),
    options: {
      payload: {
        output: "stream",
        parse: true,
        multipart: true,
        maxBytes: 50 * 1024 * 1024,
      },
    },
  });
  server.route({
    method: "POST",
    path: "/api/upload/recommendation/scaler-y",
    handler: (r, h) =>
      handleSingleAssetUpload(
        r,
        h,
        "recommendation",
        "scaler Y",
        RECOMMENDATION_SCALERS_DIR,
        "scaler_y.pkl"
      ),
    options: {
      payload: {
        output: "stream",
        parse: true,
        multipart: true,
        maxBytes: 50 * 1024 * 1024,
      },
    },
  });
  server.route({
    method: "POST",
    path: "/api/upload/recommendation/metadata",
    handler: (r, h) =>
      handleSingleAssetUpload(
        r,
        h,
        "recommendation",
        "metadata",
        RECOMMENDATION_METADATA_DIR,
        "metadata.json"
      ),
    options: {
      payload: {
        output: "stream",
        parse: true,
        multipart: true,
        maxBytes: 10 * 1024 * 1024,
      },
    },
  });
  server.route({
    method: "GET",
    path: "/api/models/detection/info",
    handler: (r, h) => getModelInfo(r, h, "detection"),
  });
  server.route({
    method: "GET",
    path: "/api/models/recommendation/info",
    handler: (r, h) => getModelInfo(r, h, "recommendation"),
  });
  server.route({
    method: "GET",
    path: `/${MODELS_DIR_RELATIVE_FOR_CLIENT}/{modelType}/{param*}`,
    handler: {
      directory: {
        path: (request) => {
          return path.join(MODELS_DIR, request.params.modelType);
        },
        redirectToSlash: true,
        index: false,
        listing: false,
      },
    },
  });

  server.route({
    method: "POST",
    path: "/api/training-data/upload",
    options: {
      payload: {
        output: "stream",
        parse: true,
        multipart: true,
        maxBytes: 10 * 1024 * 1024,
      },
    },
    handler: async (request, h) => {
      const { trainingImage, foodName, description } = request.payload;
      if (!trainingImage || !trainingImage.hapi || !trainingImage.hapi.filename)
        return h.response({ error: "File gambar tidak valid." }).code(400);
      if (!foodName)
        return h.response({ error: "Nama makanan wajib diisi." }).code(400);

      const id = uuidv4();
      const fileExtension = path.extname(trainingImage.hapi.filename);
      const newFilename = `${id}${fileExtension}`;
      const imagePathOnServer = path.join(TRAINING_UPLOADS_DIR, newFilename);
      const imageUrlForClient = `/${TRAINING_IMAGES_RELATIVE_FOR_CLIENT}/${newFilename}`;

      try {
        await new Promise((resolve, reject) => {
          const fileStream = fs.createWriteStream(imagePathOnServer);
          trainingImage.pipe(fileStream);
          trainingImage.on("error", reject);
          fileStream.on("finish", resolve);
          fileStream.on("error", reject);
        });

        const stmt = db.prepare(
          `INSERT INTO training_images (id, filename, foodName, description, imageUrl, isUsed) VALUES (?, ?, ?, ?, ?, ?)`
        );
        await new Promise((resolve, reject) => {
          stmt.run(
            id,
            newFilename,
            foodName,
            description || null,
            imageUrlForClient,
            false,
            function (err) {
              if (err) return reject(err);
              resolve(this.lastID);
            }
          );
          stmt.finalize();
        });

        return h
          .response({
            message: "Gambar latih berhasil diunggah.",
            id: id,
            imageUrl: imageUrlForClient,
          })
          .code(201);
      } catch (err) {
        console.error("[HAPI ERROR] Error mengunggah gambar latih:", err);
        if (await fs.pathExists(imagePathOnServer))
          await fs
            .remove(imagePathOnServer)
            .catch((e) => console.warn("Gagal hapus gambar setelah error:", e));
        return h
          .response({ error: `Gagal mengunggah gambar latih: ${err.message}` })
          .code(500);
      }
    },
  });
  server.route({
    method: "GET",
    path: "/api/training-data",
    handler: async (request, h) => {
      try {
        const rows = await new Promise((resolve, reject) => {
          db.all(
            "SELECT id, filename, foodName, description, imageUrl, isUsed, uploadedAt FROM training_images ORDER BY uploadedAt DESC",
            [],
            (err, rows) => {
              if (err) return reject(err);
              resolve(rows);
            }
          );
        });
        return h.response({ data: rows }).code(200);
      } catch (err) {
        console.error("[HAPI ERROR] Error mengambil data gambar latih:", err);
        return h
          .response({ error: "Gagal mengambil data gambar latih." })
          .code(500);
      }
    },
  });
  server.route({
    method: "PUT",
    path: "/api/training-data/{id}/mark-used",
    options: { payload: { parse: true, allow: "application/json" } },
    handler: async (request, h) => {
      const { id } = request.params;
      try {
        const result = await new Promise((resolve, reject) => {
          db.run(
            "UPDATE training_images SET isUsed = TRUE WHERE id = ?",
            [id],
            function (err) {
              if (err) return reject(err);
              resolve(this.changes);
            }
          );
        });
        if (result === 0)
          return h
            .response({ error: "Gambar dengan ID tersebut tidak ditemukan." })
            .code(404);
        return h
          .response({
            message: "Gambar berhasil ditandai sebagai sudah dipakai.",
          })
          .code(200);
      } catch (err) {
        console.error(
          "[HAPI ERROR] Error menandai gambar sebagai sudah dipakai:",
          err
        );
        return h
          .response({ error: "Gagal menandai gambar sebagai sudah dipakai." })
          .code(500);
      }
    },
  });
  server.route({
    method: "DELETE",
    path: "/api/training-data/{id}",
    handler: async (request, h) => {
      const { id } = request.params;
      try {
        const row = await new Promise((resolve, reject) => {
          db.get(
            "SELECT filename FROM training_images WHERE id = ?",
            [id],
            (err, row) => {
              if (err) return reject(err);
              resolve(row);
            }
          );
        });
        if (!row)
          return h
            .response({
              error: "Gambar dengan ID tersebut tidak ditemukan di database.",
            })
            .code(404);
        const dbResult = await new Promise((resolve, reject) => {
          db.run(
            "DELETE FROM training_images WHERE id = ?",
            [id],
            function (err) {
              if (err) return reject(err);
              resolve(this.changes);
            }
          );
        });
        if (dbResult === 0)
          return h
            .response({
              error:
                "Gagal menghapus gambar dari database (ID tidak ditemukan saat operasi delete).",
            })
            .code(404);
        const imagePathOnServer = path.join(TRAINING_UPLOADS_DIR, row.filename);
        if (await fs.pathExists(imagePathOnServer)) {
          await fs.remove(imagePathOnServer);
          console.log(
            `File gambar ${row.filename} berhasil dihapus dari server.`
          );
        } else {
          console.warn(
            `File gambar ${row.filename} tidak ditemukan di server untuk dihapus, namun record DB dihapus.`
          );
        }
        return h
          .response({ message: "Gambar latih berhasil dihapus." })
          .code(200);
      } catch (err) {
        console.error(
          `[HAPI ERROR] Error menghapus gambar latih dengan ID ${id}:`,
          err
        );
        return h
          .response({ error: `Gagal menghapus gambar latih: ${err.message}` })
          .code(500);
      }
    },
  });
  server.route({
    method: "DELETE",
    path: "/api/training-data/used",
    handler: async (request, h) => {
      try {
        const usedImages = await new Promise((resolve, reject) => {
          db.all(
            "SELECT id, filename FROM training_images WHERE isUsed = TRUE",
            [],
            (err, rows) => {
              if (err) return reject(err);
              resolve(rows);
            }
          );
        });
        if (usedImages.length === 0)
          return h
            .response({
              message: "Tidak ada gambar yang sudah dipakai untuk dihapus.",
            })
            .code(200);
        const idsToDelete = usedImages.map((img) => img.id);
        const placeholders = idsToDelete.map(() => "?").join(",");
        const dbResult = await new Promise((resolve, reject) => {
          db.run(
            `DELETE FROM training_images WHERE id IN (${placeholders})`,
            idsToDelete,
            function (err) {
              if (err) return reject(err);
              resolve(this.changes);
            }
          );
        });
        if (dbResult === 0)
          console.warn(
            "Tidak ada record gambar yang terhapus dari DB meskipun query 'used' mengembalikan hasil."
          );
        let filesDeletedCount = 0;
        for (const image of usedImages) {
          const imagePathOnServer = path.join(
            TRAINING_UPLOADS_DIR,
            image.filename
          );
          if (await fs.pathExists(imagePathOnServer)) {
            await fs.remove(imagePathOnServer);
            filesDeletedCount++;
          } else {
            console.warn(
              `File gambar ${image.filename} (ID: ${image.id}) yang ditandai 'used' tidak ditemukan di server untuk dihapus.`
            );
          }
        }
        console.log(
          `${filesDeletedCount} file gambar yang sudah dipakai berhasil dihapus dari server.`
        );
        return h
          .response({
            message: `${dbResult} gambar yang sudah dipakai berhasil dihapus.`,
          })
          .code(200);
      } catch (err) {
        console.error(
          "[HAPI ERROR] Error menghapus semua gambar latih yang sudah dipakai:",
          err
        );
        return h
          .response({
            error: `Gagal menghapus gambar yang sudah dipakai: ${err.message}`,
          })
          .code(500);
      }
    },
  });
  server.route({
    method: "GET",
    path: `/${TRAINING_IMAGES_RELATIVE_FOR_CLIENT}/{filename}`,
    handler: {
      directory: {
        path: TRAINING_UPLOADS_DIR,
        redirectToSlash: false,
        index: false,
        listing: false,
      },
    },
  });

  // --- Rute Baru untuk Download ZIP Dataset Belum Dipakai ---
  server.route({
    method: "GET",
    path: "/api/training-data/download-unused-zip",
    handler: async (request, h) => {
      try {
        const unusedImages = await new Promise((resolve, reject) => {
          db.all(
            "SELECT id, filename, foodName FROM training_images WHERE isUsed = FALSE",
            [],
            (err, rows) => {
              if (err) return reject(err);
              resolve(rows);
            }
          );
        });

        if (unusedImages.length === 0) {
          return h
            .response({
              message: "Tidak ada dataset gambar yang belum dipakai.",
            })
            .code(404);
        }

        const timestamp = new Date()
          .toISOString()
          .replace(/:/g, "-")
          .replace(/\..+/, ""); // Hapus milidetik
        const zipFileName = `unused_training_dataset_${timestamp}.zip`;
        const zipFilePath = path.join(TRAINING_ZIPS_DIR, zipFileName);

        await ensureDirExists(TRAINING_ZIPS_DIR); // Pastikan direktori ada

        const output = fs.createWriteStream(zipFilePath);
        const archive = archiver("zip", { zlib: { level: 9 } });

        let filesAddedToZip = 0;

        archive.on("error", function (err) {
          console.error("Archiver error:", err);
          // Jangan coba kirim respons jika header sudah dikirim
          if (!h.request.response.headersSent) {
            return h
              .response({ error: `Gagal membuat arsip ZIP: ${err.message}` })
              .code(500);
          }
        });

        // Menunggu output stream selesai menulis ke disk
        await new Promise((resolveOutput, rejectOutput) => {
          output.on("close", () => {
            console.log(
              `Arsip ZIP ${zipFileName} (${archive.pointer()} total bytes) telah selesai ditulis.`
            );
            filesAddedToZip = archive.pointer() > 0 ? unusedImages.length : 0; // Perkiraan kasar, lebih baik hitung manual jika perlu presisi
            resolveOutput();
          });
          output.on("error", (err) => {
            console.error("Output stream error:", err);
            rejectOutput(err);
          });
          archive.pipe(output); // Pipe archive data to the file

          for (const image of unusedImages) {
            const imagePathOnServer = path.join(
              TRAINING_UPLOADS_DIR,
              image.filename
            );
            if (fs.pathExistsSync(imagePathOnServer)) {
              // Gunakan sync di sini karena dalam loop
              const entryName = path.join(
                image.foodName.replace(/[^a-zA-Z0-9_-\s]/g, "_"),
                image.filename
              );
              archive.file(imagePathOnServer, { name: entryName });
            } else {
              console.warn(
                `File gambar ${image.filename} untuk ${image.foodName} tidak ditemukan di server, dilewati.`
              );
            }
          }
          archive.finalize();
        });

        if (filesAddedToZip === 0 && unusedImages.length > 0) {
          // Jika ada gambar di DB tapi tidak ada yang berhasil ditambahkan ke ZIP (misal semua path file salah)
          console.warn(
            `Tidak ada file yang berhasil ditambahkan ke ZIP ${zipFileName} meskipun ada ${unusedImages.length} gambar belum dipakai di DB.`
          );
          // Hapus file ZIP kosong yang mungkin terbuat
          if (await fs.pathExists(zipFilePath)) await fs.remove(zipFilePath);
          return h
            .response({
              message:
                "Tidak ada file gambar yang valid ditemukan untuk di-ZIP.",
            })
            .code(404);
        }

        // Tandai gambar sebagai sudah dipakai SETELAH ZIP berhasil dibuat
        const idsToUpdate = unusedImages.map((img) => img.id);
        if (idsToUpdate.length > 0) {
          const placeholders = idsToUpdate.map(() => "?").join(",");
          await new Promise((resolve, reject) => {
            db.run(
              `UPDATE training_images SET isUsed = TRUE WHERE id IN (${placeholders})`,
              idsToUpdate,
              function (err) {
                if (err) {
                  console.error(
                    "Gagal update status gambar ke isUsed=TRUE:",
                    err
                  );
                  return reject(err); // Penting untuk menangani error ini
                }
                console.log(
                  `${this.changes} gambar ditandai sebagai sudah dipakai setelah di-ZIP.`
                );
                resolve();
              }
            );
          });
        }

        // Kirim file ZIP sebagai respons
        return h
          .file(zipFilePath, { confine: false }) // confine: false karena TRAINING_ZIPS_DIR mungkin di luar root server utama
          .header("Content-Disposition", `attachment; filename=${zipFileName}`)
          .header("Content-Type", "application/zip");
      } catch (err) {
        console.error(
          "[HAPI ERROR] Error membuat atau mengirim ZIP dataset belum dipakai:",
          err
        );
        // Pastikan tidak mengirim respons jika sudah ada error dari archiver/output stream
        if (!h.request.response || !h.request.response.headersSent) {
          return h
            .response({
              error: `Gagal memproses permintaan ZIP: ${err.message}`,
            })
            .code(500);
        }
      }
    },
  });

  // --- Rute untuk Mengelola File ZIP Dataset yang Tersimpan ---
  server.route({
    method: "GET",
    path: "/api/training-data/zips",
    handler: async (request, h) => {
      try {
        await ensureDirExists(TRAINING_ZIPS_DIR);
        const files = await fs.readdir(TRAINING_ZIPS_DIR);
        const zipFiles = [];
        for (const file of files) {
          if (file.toLowerCase().endsWith(".zip")) {
            const filePath = path.join(TRAINING_ZIPS_DIR, file);
            try {
              const stats = await fs.stat(filePath);
              zipFiles.push({
                filename: file,
                size: stats.size,
                createdAt: stats.birthtime,
              });
            } catch (statError) {
              console.warn(
                `Gagal mendapatkan stat untuk file ${filePath}:`,
                statError.message
              );
              // Bisa jadi file baru saja dihapus atau ada isu permission, lewati saja file ini
            }
          }
        }
        zipFiles.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        return h.response(zipFiles).code(200);
      } catch (err) {
        console.error("[HAPI ERROR] Gagal mengambil daftar file ZIP:", err);
        return h
          .response({ error: "Gagal mengambil daftar file ZIP." })
          .code(500);
      }
    },
  });

  server.route({
    method: "GET",
    path: "/api/training-data/zips/{filename}",
    handler: (request, h) => {
      const filename = request.params.filename;
      if (filename.includes("..") || filename.includes("/")) {
        return h.response({ error: "Nama file tidak valid." }).code(400);
      }
      const filePath = path.join(TRAINING_ZIPS_DIR, filename);
      if (!fs.pathExistsSync(filePath)) {
        return h.response({ error: "File ZIP tidak ditemukan." }).code(404);
      }
      return h
        .file(filePath, { confine: false })
        .header("Content-Disposition", `attachment; filename=${filename}`)
        .header("Content-Type", "application/zip");
    },
  });

  server.route({
    method: "DELETE",
    path: "/api/training-data/zips/{filename}",
    handler: async (request, h) => {
      const filename = request.params.filename;
      if (filename.includes("..") || filename.includes("/")) {
        return h.response({ error: "Nama file tidak valid." }).code(400);
      }
      const filePath = path.join(TRAINING_ZIPS_DIR, filename);
      try {
        if (await fs.pathExists(filePath)) {
          await fs.remove(filePath);
          console.log(`File ZIP ${filename} berhasil dihapus.`);
          return h
            .response({ message: `File ZIP ${filename} berhasil dihapus.` })
            .code(200);
        } else {
          return h
            .response({ error: "File ZIP tidak ditemukan untuk dihapus." })
            .code(404);
        }
      } catch (err) {
        console.error(
          `[HAPI ERROR] Gagal menghapus file ZIP ${filename}:`,
          err
        );
        return h
          .response({ error: `Gagal menghapus file ZIP: ${err.message}` })
          .code(500);
      }
    },
  });

  // --- Rute Default ---
  server.route({
    method: "GET",
    path: "/",
    handler: (r, h) => "Server Aktif!",
  });

  await server.start();
  console.log("Server Hapi.js berjalan di %s", server.info.uri);
};

process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
  process.exit(1);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
});

init();
