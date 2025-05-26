// script.js
document.addEventListener("DOMContentLoaded", () => {
  // --- Variabel Global untuk URL Server Hapi.js ---
  let HAPI_SERVER_URL =
    localStorage.getItem("hapiServerURL") || "http://localhost:3000";

  // --- DOM Elements ---
  const homeBrandLink = document.getElementById("homeBrandLink");
  const dataManagementLink = document.getElementById("dataManagementLink");
  const modelManagementLink = document.getElementById("modelManagementLink");
  const trainingImageManagementLink = document.getElementById(
    "trainingImageManagementLink"
  );

  const dataManagementArea = document.getElementById("dataManagementArea");
  const modelManagementArea = document.getElementById("modelManagementArea");
  const trainingImageManagementArea = document.getElementById(
    "trainingImageManagementArea"
  );

  const sheetTabs = document.querySelectorAll("#sheetTabs .nav-link");
  const searchInputScrap = document.getElementById("searchInputScrap");
  const searchInputCache = document.getElementById("searchInputCache");
  const searchInputResultTable = document.getElementById(
    "searchInputResultTable"
  );
  const foodNutritionSearchInput = document.getElementById(
    "foodNutritionSearchInput"
  );
  const fetchFoodNutritionButton = document.getElementById(
    "fetchFoodNutritionButton"
  );
  const foodDetailResultArea = document.getElementById("foodDetailResultArea");
  const foodDetailName = document.getElementById("foodDetailName");
  const foodDetailJson = document.getElementById("foodDetailJson");
  const foodDetailError = document.getElementById("foodDetailError");

  const editModalEl = document.getElementById("editModal");
  const settingsModalEl = document.getElementById("settingsModal");

  const editModal = editModalEl ? new bootstrap.Modal(editModalEl) : null;
  const settingsModal = settingsModalEl
    ? new bootstrap.Modal(settingsModalEl)
    : null;

  const saveButton = document.getElementById("saveButton");
  const saveAppSettingsButton = document.getElementById(
    "saveAppSettingsButton"
  );
  const editForm = document.getElementById("editForm");

  const gasUrlInput = document.getElementById("gasUrlInput");
  const masterSpreadsheetUrlInput = document.getElementById(
    "masterSpreadsheetUrlInput"
  );

  const credentialsInput = document.getElementById("credentialsInput");
  const uploadCredentialsButton = document.getElementById(
    "uploadCredentialsButton"
  );
  const deleteCredentialsButton = document.getElementById(
    "deleteCredentialsButton"
  );
  const credentialsUploadStatus = document.getElementById(
    "credentialsUploadStatus"
  );
  const credentialsFileStatus = document.getElementById(
    "credentialsFileStatus"
  );

  const detectionModelInput = document.getElementById("detectionModelInput");
  const detectionLabelInput = document.getElementById("detectionLabelInput");
  const uploadDetectionModelButton = document.getElementById(
    "uploadDetectionModelButton"
  );
  const checkDetectionModelButton = document.getElementById(
    "checkDetectionModelButton"
  );
  const detectionModelStatus = document.getElementById("detectionModelStatus");
  const detectionModelContentInfo = document.getElementById(
    "detectionModelContentInfo"
  );
  const detectionLabelInfo = document.getElementById("detectionLabelInfo");

  const recommendationModelInput = document.getElementById(
    "recommendationModelInput"
  );
  const recommendationLabelInput = document.getElementById(
    "recommendationLabelInput"
  );
  const uploadRecommendationModelButton = document.getElementById(
    "uploadRecommendationModelButton"
  );
  const recommendationScalerXInput = document.getElementById(
    "recommendationScalerXInput"
  );
  const uploadRecommendationScalerXButton = document.getElementById(
    "uploadRecommendationScalerXButton"
  );
  const recommendationScalerYInput = document.getElementById(
    "recommendationScalerYInput"
  );
  const uploadRecommendationScalerYButton = document.getElementById(
    "uploadRecommendationScalerYButton"
  );
  const recommendationMetadataInput = document.getElementById(
    "recommendationMetadataInput"
  );
  const uploadRecommendationMetadataButton = document.getElementById(
    "uploadRecommendationMetadataButton"
  );
  const checkRecommendationModelButton = document.getElementById(
    "checkRecommendationModelButton"
  );
  const recommendationModelStatus = document.getElementById(
    "recommendationModelStatus"
  );
  const recommendationModelContentInfo = document.getElementById(
    "recommendationModelContentInfo"
  );
  const recommendationLabelInfo = document.getElementById(
    "recommendationLabelInfo"
  );
  const recommendationScalerXInfo = document.getElementById(
    "recommendationScalerXInfo"
  );
  const recommendationScalerYInfo = document.getElementById(
    "recommendationScalerYInfo"
  );
  const recommendationMetadataInfo = document.getElementById(
    "recommendationMetadataInfo"
  );

  const uploadTrainingImageForm = document.getElementById(
    "uploadTrainingImageForm"
  );
  const trainingImageFile = document.getElementById("trainingImageFile");
  const trainingFoodName = document.getElementById("trainingFoodName");
  const trainingFoodDescription = document.getElementById(
    "trainingFoodDescription"
  );
  const trainingImageGallery = document.getElementById("trainingImageGallery");
  const trainingImageGalleryPlaceholder = document.getElementById(
    "trainingImageGalleryPlaceholder"
  );
  const deleteAllUsedButton = document.getElementById("deleteAllUsedButton");
  const trainingImageUploadChartCanvas = document.getElementById(
    "trainingImageUploadChart"
  );
  const trainingImageChartPlaceholder = document.getElementById(
    "trainingImageChartPlaceholder"
  );

  // Tombol dan area untuk ZIP dataset
  const downloadAllUnusedButton = document.getElementById(
    "downloadAllUnusedButton"
  );
  const datasetZipList = document.getElementById("datasetZipList");
  const datasetZipListPlaceholder = document.getElementById(
    "datasetZipListPlaceholder"
  );

  const statScrapCount = document.getElementById("statScrapCount");
  const statCacheCount = document.getElementById("statCacheCount");
  const statResultCount = document.getElementById("statResultCount");
  const statTrainingTotal = document.getElementById("statTrainingTotal");
  const statTrainingUnused = document.getElementById("statTrainingUnused");
  const statTrainingUsed = document.getElementById("statTrainingUsed");
  const regionalNutrientStatsArea = document.getElementById(
    "regionalNutrientStatsArea"
  );
  const regionalNutrientStatsPlaceholder = document.getElementById(
    "regionalNutrientStatsPlaceholder"
  );

  const hapiConfigModalEl = document.getElementById("hapiConfigModal");
  const hapiConfigModalInstance = hapiConfigModalEl
    ? new bootstrap.Modal(hapiConfigModalEl, {
        backdrop: "static",
        keyboard: false,
      })
    : null;
  const hapiServerUrlInput = document.getElementById("hapiServerUrlInput");
  const saveHapiServerUrlButton = document.getElementById(
    "saveHapiServerUrlButton"
  );
  const hapiServerUrlSettingsInput = document.getElementById(
    "hapiServerUrlSettingsInput"
  );

  let currentView = "data";
  let currentSheet = "Scrap_Food_Name_List";
  let serverConfig = {
    gasUrl: "",
    masterSpreadsheetUrl: "",
    isGasAuthRequired: false,
    serviceAccountKeyExists: false,
  };
  let dataCache = {};
  let trainingImageDataCache = [];
  let currentEditItemIdForGAS = null;
  let currentEditSheetName = null;
  let trainingImageChartInstance = null;

  const sheetColumns = {
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

  function showSuccessAlert(message) {
    Swal.fire({
      icon: "success",
      title: "Berhasil!",
      text: message,
      timer: 2500,
      showConfirmButton: false,
    });
  }
  function showErrorAlert(message) {
    Swal.fire({ icon: "error", title: "Oops...", text: message });
  }
  function showWarningAlert(message) {
    Swal.fire({ icon: "warning", title: "Perhatian!", text: message });
  }
  function showInfoAlert(message) {
    Swal.fire({ icon: "info", title: "Informasi", text: message });
  }

  function setActiveNavLink(activeLink) {
    [
      dataManagementLink,
      modelManagementLink,
      trainingImageManagementLink,
    ].forEach((link) => {
      if (link) link.classList.remove("active");
    });
    if (activeLink) activeLink.classList.add("active");
  }

  function showView(viewName, forceRefreshData = false) {
    console.log(
      `Navigating to view: ${viewName}, currentView: ${currentView}, forceRefresh: ${forceRefreshData}`
    );
    currentView = viewName;

    if (
      dataManagementArea &&
      modelManagementArea &&
      trainingImageManagementArea
    ) {
      dataManagementArea.classList.add("d-none");
      modelManagementArea.classList.add("d-none");
      trainingImageManagementArea.classList.add("d-none");

      if (viewName === "data") {
        dataManagementArea.classList.remove("d-none");
        setActiveNavLink(dataManagementLink);
        if (serverConfig.gasUrl) {
          if (
            forceRefreshData ||
            !dataCache[currentSheet] ||
            (dataCache[currentSheet] && dataCache[currentSheet].length <= 1)
          ) {
            loadSheetData(currentSheet, true);
          } else {
            const containerId = `tableContainer${currentSheet.split("_")[0]}`;
            const container = document.getElementById(containerId);
            if (container && dataCache[currentSheet]) {
              renderTable(container, dataCache[currentSheet], currentSheet);
              showLoading(currentSheet, false);
            }
          }
          updateSpreadsheetStats();
          displayRegionalNutrientStats();
        } else {
          const warningMessage =
            '<p class="text-center text-warning p-3">URL Google Apps Script belum dikonfigurasi di Pengaturan Server.</p>';
          if (document.getElementById("tableContainerScrap"))
            document.getElementById("tableContainerScrap").innerHTML =
              warningMessage;
          if (document.getElementById("tableContainerCache"))
            document.getElementById("tableContainerCache").innerHTML =
              warningMessage;
          if (document.getElementById("tableContainerResult"))
            document.getElementById("tableContainerResult").innerHTML =
              warningMessage;
          if (regionalNutrientStatsPlaceholder)
            regionalNutrientStatsPlaceholder.textContent =
              "URL GAS belum dikonfigurasi.";
          updateSpreadsheetStats();
        }
      } else if (viewName === "model") {
        modelManagementArea.classList.remove("d-none");
        setActiveNavLink(modelManagementLink);
        if (
          forceRefreshData ||
          (detectionModelContentInfo &&
            !detectionModelContentInfo.innerHTML.includes("Versi Hash"))
        ) {
          checkAllModelInfo("detection");
        }
        if (
          forceRefreshData ||
          (recommendationModelContentInfo &&
            !recommendationModelContentInfo.innerHTML.includes("Versi Hash"))
        ) {
          checkAllModelInfo("recommendation");
        }
      } else if (viewName === "trainingImage") {
        trainingImageManagementArea.classList.remove("d-none");
        setActiveNavLink(trainingImageManagementLink);
        if (forceRefreshData || trainingImageDataCache.length === 0) {
          fetchTrainingData(true); // Ini juga akan memuat daftar ZIP
        } else {
          renderTrainingDataGallery();
          updateTrainingImageStats();
          renderTrainingImageUploadChart();
          fetchAndDisplayDatasetZips(); // Pastikan daftar ZIP juga dimuat ulang jika perlu
        }
      }
    }
    localStorage.setItem("lastActiveView", viewName);
    if (viewName === "data")
      localStorage.setItem("lastActiveSheet", currentSheet);
  }

  if (homeBrandLink)
    homeBrandLink.addEventListener("click", (e) => {
      e.preventDefault();
      showView("data", true);
    });
  if (dataManagementLink)
    dataManagementLink.addEventListener("click", (e) => {
      e.preventDefault();
      showView("data", true);
    });
  if (modelManagementLink)
    modelManagementLink.addEventListener("click", (e) => {
      e.preventDefault();
      showView("model", true);
    });
  if (trainingImageManagementLink)
    trainingImageManagementLink.addEventListener("click", (e) => {
      e.preventDefault();
      showView("trainingImage", true);
    });

  async function fetchAppConfig() {
    console.log(
      `Fetching app configuration from Hapi server: ${HAPI_SERVER_URL}/api/config`
    );
    try {
      const response = await fetch(`${HAPI_SERVER_URL}/api/config`);
      if (!response.ok) {
        let errorText = `Failed to fetch app configuration: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorText = errorData.error || errorText;
        } catch (e) {
          /* ignore */
        }
        console.error(
          "Error fetching app configuration (server responded with error):",
          errorText
        );
        if (credentialsFileStatus)
          credentialsFileStatus.innerHTML =
            '<span class="text-danger">Gagal memeriksa status kredensial.</span>';
        if (
          (response.status >= 400 && response.status < 500) ||
          response.status >= 500
        )
          return "SERVER_RESPONDED_ERROR";
        return "CONNECTION_ERROR";
      }
      const config = await response.json();
      console.log("App configuration received:", config);
      serverConfig = { ...serverConfig, ...config };

      if (gasUrlInput) gasUrlInput.value = serverConfig.gasUrl;
      if (masterSpreadsheetUrlInput)
        masterSpreadsheetUrlInput.value = serverConfig.masterSpreadsheetUrl;
      updateCredentialsStatusDisplay(
        serverConfig.serviceAccountKeyExists,
        null
      );
      return true;
    } catch (error) {
      console.error(
        "Error fetching app configuration (network or CORS issue):",
        error
      );
      if (credentialsFileStatus)
        credentialsFileStatus.innerHTML =
          '<span class="text-danger">Gagal memeriksa status kredensial. Server mungkin tidak dapat dijangkau.</span>';
      return "CONNECTION_ERROR";
    }
  }

  async function saveAppConfigToServer() {
    const initialHapiURLForSave = HAPI_SERVER_URL;
    const newGasUrl = gasUrlInput ? gasUrlInput.value.trim() : "";
    const newMasterSpreadsheetUrl = masterSpreadsheetUrlInput
      ? masterSpreadsheetUrlInput.value.trim()
      : "";
    const newHapiUrlFromSettings = hapiServerUrlSettingsInput
      ? hapiServerUrlSettingsInput.value.trim()
      : initialHapiURLForSave;
    let hapiURLActuallyChanged = false;

    if (
      newHapiUrlFromSettings &&
      newHapiUrlFromSettings !== initialHapiURLForSave
    ) {
      try {
        new URL(newHapiUrlFromSettings);
        HAPI_SERVER_URL = newHapiUrlFromSettings;
        localStorage.setItem("hapiServerURL", HAPI_SERVER_URL);
        console.log(
          "Hapi server URL updated via settings to:",
          HAPI_SERVER_URL
        );
        hapiURLActuallyChanged = true;
      } catch (e) {
        showErrorAlert(
          "Format URL server Hapi.js di pengaturan tidak valid. Perubahan URL Hapi tidak disimpan."
        );
        if (hapiServerUrlSettingsInput)
          hapiServerUrlSettingsInput.value = initialHapiURLForSave;
        return;
      }
    }

    const configToSave = {
      gasUrl: newGasUrl,
      masterSpreadsheetUrl: newMasterSpreadsheetUrl,
      isGasAuthRequired: serverConfig.isGasAuthRequired,
    };

    console.log(
      "Saving app configuration to Hapi server:",
      configToSave,
      "Current HAPI_SERVER_URL for client:",
      HAPI_SERVER_URL
    );
    Swal.fire({
      title: "Menyimpan Pengaturan",
      text: "Harap tunggu...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      const response = await fetch(`${HAPI_SERVER_URL}/api/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(configToSave),
      });

      if (!response.ok) {
        let errorMsg = `Gagal menyimpan konfigurasi: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMsg += ` - ${errorData.error || "Unknown server error"}`;
        } catch (e) {
          /* Gagal parse JSON error */
        }
        throw new Error(errorMsg);
      }

      const result = await response.json();
      Swal.close();
      console.log("Save app config response from Hapi:", result);
      serverConfig = { ...serverConfig, ...result };

      showSuccessAlert(
        result.message || "Pengaturan aplikasi berhasil disimpan!"
      );
      if (settingsModal) settingsModal.hide();

      if (hapiURLActuallyChanged || serverConfig.gasUrl !== newGasUrl) {
        showInfoAlert(
          "Konfigurasi server diubah. Memuat ulang data aplikasi..."
        );
        dataCache = {};
        trainingImageDataCache = [];
        await initializeApp();
      } else {
        if (gasUrlInput) gasUrlInput.value = serverConfig.gasUrl;
        if (masterSpreadsheetUrlInput)
          masterSpreadsheetUrlInput.value = serverConfig.masterSpreadsheetUrl;
        updateCredentialsStatusDisplay(
          serverConfig.serviceAccountKeyExists,
          null
        );
      }
    } catch (error) {
      Swal.close();
      console.error("Error saving app configuration:", error);
      showErrorAlert(`Gagal menyimpan konfigurasi aplikasi: ${error.message}`);
      if (hapiURLActuallyChanged) {
        HAPI_SERVER_URL = initialHapiURLForSave;
        localStorage.setItem("hapiServerURL", HAPI_SERVER_URL);
        if (hapiServerUrlSettingsInput)
          hapiServerUrlSettingsInput.value = HAPI_SERVER_URL;
        console.warn(
          "Save failed after HAPI URL change, HAPI URL reverted to:",
          HAPI_SERVER_URL
        );
        showErrorAlert(
          "Gagal menyimpan pengaturan ke alamat server Hapi yang baru. Alamat server Hapi telah dikembalikan ke sebelumnya."
        );
        const connectionStatus = await fetchAppConfig();
        if (
          connectionStatus === "CONNECTION_ERROR" &&
          hapiConfigModalInstance &&
          hapiServerUrlInput
        ) {
          hapiServerUrlInput.value = HAPI_SERVER_URL;
          hapiConfigModalInstance.show();
        }
      }
    }
  }
  if (saveAppSettingsButton)
    saveAppSettingsButton.addEventListener("click", saveAppConfigToServer);

  async function callHapiGasProxyApi(
    method,
    sheetNameOrActionTarget,
    payloadData = {},
    rowIdentifier = null
  ) {
    let url;
    let finalPayload = { ...payloadData };

    if (sheetNameOrActionTarget === "get_food_nutrition_by_name") {
      if (!payloadData.foodName) {
        showErrorAlert("Nama makanan wajib diisi untuk pencarian gizi.");
        return null;
      }
      url = `${HAPI_SERVER_URL}/api/food-nutrition/${encodeURIComponent(
        payloadData.foodName
      )}`;
    } else {
      url = `${HAPI_SERVER_URL}/api/sheet-data/${sheetNameOrActionTarget}`;
      if (rowIdentifier !== null) url += `/${rowIdentifier}`;
      finalPayload.sheet = sheetNameOrActionTarget;
      if (rowIdentifier) finalPayload.rowIndex = rowIdentifier;
    }

    // console.log(`Calling Hapi Proxy: ${method} ${url}`, method !== "GET" ? JSON.stringify(finalPayload) : "");

    const options = {
      method: method,
      headers: { "Content-Type": "application/json" },
    };
    if (
      method !== "GET" &&
      method !== "DELETE" &&
      Object.keys(finalPayload).length > 0 &&
      sheetNameOrActionTarget !== "get_food_nutrition_by_name"
    ) {
      options.body = JSON.stringify(finalPayload);
    } else if (
      method === "POST" &&
      sheetNameOrActionTarget !== "get_food_nutrition_by_name"
    ) {
      options.body = JSON.stringify(finalPayload);
    }

    try {
      const response = await fetch(url, options);
      if (method === "DELETE" && response.ok) {
        if (response.status === 204)
          return {
            success: true,
            message: "Data berhasil dihapus (no content).",
          };
        try {
          return await response.json();
        } catch (e) {
          return { success: true, message: "Data berhasil dihapus." };
        }
      }

      const result = await response.json();
      if (!response.ok) {
        throw new Error(
          result.error ||
            result.message ||
            `API Error: ${response.statusText} (Code: ${response.status})`
        );
      }
      return result;
    } catch (error) {
      console.error(
        `Error calling Hapi Proxy (${method} ${sheetNameOrActionTarget}):`,
        error
      );
      const userMessage = `Gagal ${
        method === "GET"
          ? "mengambil"
          : method === "POST"
          ? "menambah"
          : method === "PUT"
          ? "memperbarui"
          : "menghapus"
      } data: ${error.message}.`;
      showErrorAlert(userMessage);
      if (
        error.message.toLowerCase().includes("failed to fetch") ||
        error.message.toLowerCase().includes("networkerror")
      ) {
        const status = await fetchAppConfig();
        if (
          status === "CONNECTION_ERROR" &&
          hapiConfigModalInstance &&
          hapiServerUrlInput
        ) {
          hapiServerUrlInput.value = HAPI_SERVER_URL;
          hapiConfigModalInstance.show();
        }
      }
      return null;
    }
  }

  function updateSpreadsheetStats() {
    fetch(`${HAPI_SERVER_URL}/api/spreadsheet-stats`)
      .then((response) =>
        response.ok
          ? response.json()
          : Promise.reject(
              new Error(`Failed to fetch stats: ${response.status}`)
            )
      )
      .then((stats) => {
        if (statScrapCount)
          statScrapCount.textContent = stats["Scrap_Food_Name_List"] || 0;
        if (statCacheCount)
          statCacheCount.textContent = stats["Cache_Food_Name_List"] || 0;
        if (statResultCount)
          statResultCount.textContent = stats["Result_Food_Name_List"] || 0;
      })
      .catch((error) => {
        console.warn(
          "Error fetching spreadsheet stats (likely HAPI unreachable or no GAS URL):",
          error
        );
        if (statScrapCount) statScrapCount.textContent = "N/A";
        if (statCacheCount) statCacheCount.textContent = "N/A";
        if (statResultCount) statResultCount.textContent = "N/A";
      });
  }

  async function displayRegionalNutrientStats() {
    if (!regionalNutrientStatsArea || !regionalNutrientStatsPlaceholder) return;
    regionalNutrientStatsPlaceholder.textContent =
      "Memuat statistik regional...";
    regionalNutrientStatsPlaceholder.classList.remove("d-none");
    regionalNutrientStatsArea.innerHTML = "";
    try {
      const response = await fetch(
        `${HAPI_SERVER_URL}/api/regional-nutrient-stats`
      );
      if (!response.ok)
        throw new Error(
          `Gagal mengambil statistik regional: ${response.statusText}`
        );
      const result = await response.json();
      const statsData = result.data;

      if (!statsData || statsData.length === 0) {
        regionalNutrientStatsPlaceholder.textContent =
          "Data tidak cukup untuk statistik regional atau URL GAS belum diatur.";
        return;
      }
      let tableHtml = `<div class="table-responsive" style="max-height: 300px;"><table class="table table-sm table-striped table-hover table-bordered"><thead class="table-light sticky-top"><tr><th>Daerah</th><th>Rata-rata Kalori (kkal)</th><th>Rata-rata Protein (g)</th><th>Rata-rata Lemak (g)</th><th>Rata-rata Karbohidrat (g)</th><th>Jumlah Data</th></tr></thead><tbody>`;
      statsData.forEach((stat) => {
        tableHtml += `<tr><td>${stat.region}</td><td>${stat.avgKalori}</td><td>${stat.avgProtein}</td><td>${stat.avgLemak}</td><td>${stat.avgKarbo}</td><td>${stat.count}</td></tr>`;
      });
      tableHtml += `</tbody></table></div>`;
      regionalNutrientStatsArea.innerHTML = tableHtml;
      regionalNutrientStatsPlaceholder.classList.add("d-none");
    } catch (error) {
      console.warn(
        "Error fetching regional nutrient stats (likely HAPI unreachable or no GAS URL):",
        error
      );
      regionalNutrientStatsPlaceholder.textContent =
        "Gagal memuat statistik regional.";
    }
  }

  async function loadAllSpreadsheetDataForStats() {
    if (!serverConfig.gasUrl) {
      console.warn(
        "GAS URL tidak dikonfigurasi, statistik spreadsheet tidak dapat dimuat."
      );
      updateSpreadsheetStats();
      if (regionalNutrientStatsPlaceholder)
        regionalNutrientStatsPlaceholder.textContent =
          "URL GAS belum dikonfigurasi untuk statistik regional.";
      return;
    }
    // console.log("Pre-loading all spreadsheet data for initial stats via Hapi/GAS...");
    const sheetNames = Object.keys(sheetColumns);
    sheetNames.forEach((sheetName) => showLoading(sheetName, true));

    const promises = sheetNames.map(async (sheetName) => {
      try {
        const result = await callHapiGasProxyApi("GET", sheetName);
        if (result && result.data) dataCache[sheetName] = result.data;
        else dataCache[sheetName] = [sheetColumns[sheetName] || []];
      } catch (error) {
        console.error(`Failed to preload data for ${sheetName}:`, error);
        dataCache[sheetName] = [sheetColumns[sheetName] || []];
      }
    });
    await Promise.all(promises);
    updateSpreadsheetStats();
    displayRegionalNutrientStats();

    if (currentView === "data") loadSheetData(currentSheet);
    else sheetNames.forEach((sheetName) => showLoading(sheetName, false));
  }

  async function loadSheetData(sheetName, forceRefresh = false) {
    const containerId = `tableContainer${sheetName.split("_")[0]}`;
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(
        `Container not found: ${containerId} for sheet ${sheetName}`
      );
      return;
    }

    showLoading(sheetName, true);

    if (!serverConfig.gasUrl) {
      console.warn(
        "loadSheetData cancelled: GAS URL not configured on server."
      );
      container.innerHTML =
        '<p class="text-center text-warning p-3">URL Google Apps Script belum dikonfigurasi di Pengaturan Server.</p>';
      showLoading(sheetName, false);
      updateSpreadsheetStats();
      if (sheetName === "Result_Food_Name_List" && regionalNutrientStatsArea)
        displayRegionalNutrientStats();
      return;
    }

    try {
      if (
        !forceRefresh &&
        dataCache[sheetName] &&
        dataCache[sheetName].length > 1
      ) {
        // console.log("Loading data from cache for sheet:", sheetName);
        renderTable(container, dataCache[sheetName], sheetName);
      } else {
        // console.log("Fetching data from Hapi/GAS for sheet:", sheetName);
        const result = await callHapiGasProxyApi("GET", sheetName);
        if (
          result &&
          result.data &&
          Array.isArray(result.data) &&
          result.data.length > 0
        ) {
          dataCache[sheetName] = result.data;
          renderTable(container, result.data, sheetName);
        } else if (result && result.data) {
          container.innerHTML =
            '<p class="text-center text-muted p-3">Tidak ada data untuk ditampilkan.</p>';
          dataCache[sheetName] =
            result.data.length > 0
              ? result.data
              : [sheetColumns[sheetName] || []];
        } else {
          container.innerHTML =
            '<p class="text-center text-danger p-3">Gagal memuat data atau format data tidak sesuai.</p>';
          dataCache[sheetName] = [sheetColumns[sheetName] || []];
        }
      }
    } catch (error) {
      console.error(`Error in loadSheetData for ${sheetName}:`, error);
      container.innerHTML =
        '<p class="text-center text-danger p-3">Terjadi kesalahan saat memuat data.</p>';
      dataCache[sheetName] = [sheetColumns[sheetName] || []];
    } finally {
      showLoading(sheetName, false);
      updateSpreadsheetStats();
      if (sheetName === "Result_Food_Name_List" && regionalNutrientStatsArea)
        displayRegionalNutrientStats();
    }
  }

  function renderTable(container, dataArray, sheetName) {
    if (!Array.isArray(dataArray) || dataArray.length === 0) {
      container.innerHTML =
        '<p class="text-center text-muted p-3">Tidak ada data.</p>';
      return;
    }
    const headers = dataArray[0];
    if (!Array.isArray(headers)) {
      container.innerHTML =
        '<p class="text-center text-danger p-3">Format header data tidak valid.</p>';
      return;
    }
    const rows = dataArray.slice(1);

    let tableHtml = `<table class="table table-hover table-striped table-bordered"><thead><tr>`;
    headers.forEach((header) => {
      tableHtml += `<th>${header}</th>`;
    });
    tableHtml += `<th>Aksi</th></tr></thead><tbody>`;

    rows.forEach((rowArray, rowIndexInSheetData) => {
      if (Array.isArray(rowArray)) {
        const gasRowIdentifier = rowIndexInSheetData + 2;
        tableHtml += `<tr data-gas-row-index="${gasRowIdentifier}">`;
        rowArray.forEach((cell) => {
          tableHtml += `<td>${
            cell !== null && cell !== undefined ? cell : ""
          }</td>`;
        });
        tableHtml += `<td class="text-nowrap"><button class="btn btn-sm btn-warning me-1" title="Edit" onclick="openEditModalWrapper('${sheetName}', ${gasRowIdentifier})"><i class="bi bi-pencil-square"></i></button><button class="btn btn-sm btn-danger" title="Hapus" onclick="confirmDeletion('${sheetName}', ${gasRowIdentifier})"><i class="bi bi-trash-fill"></i></button></td>`;
        tableHtml += `</tr>`;
      }
    });
    tableHtml += `</tbody></table>`;
    container.innerHTML = tableHtml;
  }

  function showLoading(sheetName, show) {
    const baseName = sheetName.split("_")[0];
    const indicatorId = `loadingIndicator${baseName}`;
    const containerId = `tableContainer${baseName}`;
    const indicator = document.getElementById(indicatorId);
    const container = document.getElementById(containerId);
    if (indicator && container) {
      indicator.style.display = show ? "flex" : "none";
      container.style.display = show ? "none" : "block";
    }
  }

  function filterTable(searchInputId, tableContainerId) {
    const input = document.getElementById(searchInputId);
    const tableContainer = document.getElementById(tableContainerId);
    if (!input || !tableContainer) return;

    const query = input.value.toLowerCase();
    const table = tableContainer.querySelector("table");
    if (!table) return;

    const rows = table.querySelectorAll("tbody tr");
    rows.forEach((row) => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(query) ? "" : "none";
    });
  }

  if (searchInputScrap)
    searchInputScrap.addEventListener("input", () =>
      filterTable("searchInputScrap", "tableContainerScrap")
    );
  if (searchInputCache)
    searchInputCache.addEventListener("input", () =>
      filterTable("searchInputCache", "tableContainerCache")
    );
  if (searchInputResultTable)
    searchInputResultTable.addEventListener("input", () =>
      filterTable("searchInputResultTable", "tableContainerResult")
    );

  if (fetchFoodNutritionButton && foodNutritionSearchInput) {
    fetchFoodNutritionButton.addEventListener("click", async () => {
      const foodNameQuery = foodNutritionSearchInput.value.trim();
      if (!foodNameQuery) {
        showWarningAlert("Masukkan nama makanan untuk dicari gizinya.");
        return;
      }

      if (foodDetailResultArea) foodDetailResultArea.style.display = "block";
      if (foodDetailName) foodDetailName.textContent = foodNameQuery;
      if (foodDetailJson) foodDetailJson.textContent = "Mencari data gizi...";
      if (foodDetailError) foodDetailError.style.display = "none";

      const result = await callHapiGasProxyApi(
        "GET",
        "get_food_nutrition_by_name",
        { foodName: foodNameQuery }
      );

      if (result && result.status === "success" && result.data) {
        if (foodDetailJson)
          foodDetailJson.textContent = JSON.stringify(result.data, null, 2);
      } else if (result && result.status === "not_found") {
        if (foodDetailJson) foodDetailJson.textContent = "";
        if (foodDetailError) {
          foodDetailError.textContent =
            result.message || `Makanan "${foodNameQuery}" tidak ditemukan.`;
          foodDetailError.style.display = "block";
        }
      } else {
        if (foodDetailJson) foodDetailJson.textContent = "";
        if (foodDetailError) {
          foodDetailError.textContent = result
            ? result.error || "Gagal mengambil data gizi."
            : "Gagal menghubungi server.";
          foodDetailError.style.display = "block";
        }
      }
    });
  }

  function generateFormFields(sheetName, dataObjectForForm = {}) {
    const columns = sheetColumns[sheetName];
    if (!columns) {
      console.error("Column definition not found for sheet:", sheetName);
      if (editForm)
        editForm.innerHTML =
          "<p class='text-danger'>Configuration error: Column definition not found.</p>";
      return;
    }
    let formHtml = "";
    columns.forEach((colKey) => {
      const value =
        dataObjectForForm[colKey] !== undefined &&
        dataObjectForForm[colKey] !== null
          ? dataObjectForForm[colKey]
          : "";
      const fieldId = `form-${colKey.replace(/[^a-zA-Z0-9]/g, "-")}`;
      if (
        colKey === "label" ||
        colKey === "porsi_lainnya (kalori)" ||
        colKey === "sumber" ||
        colKey === "name" ||
        colKey === "cache_key" ||
        colKey === "nama_makanan"
      ) {
        formHtml += `<div class="col-md-12"><label for="${fieldId}" class="form-label">${colKey}</label><textarea class="form-control" id="${fieldId}" name="${colKey}" rows="2">${value}</textarea></div>`;
      } else {
        formHtml += `<div class="col-md-6"><label for="${fieldId}" class="form-label">${colKey}</label><input type="text" class="form-control" id="${fieldId}" name="${colKey}" value="${value}"></div>`;
      }
    });
    if (editForm) editForm.innerHTML = formHtml;
  }

  window.openEditModalWrapper = (sheetName, gasRowIndex) => {
    const sheetData = dataCache[sheetName];
    if (!sheetData || sheetData.length <= 1) {
      showErrorAlert(
        "Data untuk diedit tidak ditemukan di cache. Coba muat ulang halaman."
      );
      console.error(
        "Data not found in cache for edit:",
        sheetName,
        gasRowIndex
      );
      return;
    }
    const headers = sheetData[0];
    const actualDataRowIndexInCache = gasRowIndex - 1;
    if (!sheetData[actualDataRowIndexInCache]) {
      showErrorAlert(
        `Item spesifik (baris GAS ${gasRowIndex}) tidak ditemukan untuk diedit di cache.`
      );
      console.error(
        "Specific row not found in cache for edit:",
        sheetName,
        gasRowIndex,
        "Mapped to cache index:",
        actualDataRowIndexInCache
      );
      return;
    }
    const rowArray = sheetData[actualDataRowIndexInCache];
    const rowDataObjectForForm = {};
    headers.forEach((header, index) => {
      rowDataObjectForForm[header] = rowArray[index];
    });
    currentEditSheetName = sheetName;
    currentEditItemIdForGAS = gasRowIndex;
    if (document.getElementById("editModalLabel"))
      document.getElementById(
        "editModalLabel"
      ).textContent = `Edit Data (${sheetName} - Baris GAS ${gasRowIndex})`;
    generateFormFields(sheetName, rowDataObjectForForm);
    if (editModal) editModal.show();
  };

  document.querySelectorAll(".addNewButtonContext").forEach((button) => {
    button.addEventListener("click", function () {
      currentEditSheetName = this.dataset.sheetContext;
      currentEditItemIdForGAS = null;
      if (document.getElementById("editModalLabel"))
        document.getElementById(
          "editModalLabel"
        ).textContent = `Tambah Data Baru (${currentEditSheetName})`;
      generateFormFields(currentEditSheetName, {});
    });
  });

  window.confirmDeletion = (sheetName, gasRowIndex) => {
    Swal.fire({
      title: "Apakah Anda yakin?",
      text: "Data ini akan dihapus permanen!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Ya, hapus!",
      cancelButtonText: "Batal",
    }).then(async (result) => {
      if (result.isConfirmed) {
        console.log("Deleting item:", { sheetName, gasRowIndex });
        const response = await callHapiGasProxyApi(
          "DELETE",
          sheetName,
          {},
          gasRowIndex
        );
        if (
          (response &&
            response.success !== false &&
            response.status !== "error" &&
            response.message) ||
          (response && response.data && response.data.status === "success")
        ) {
          loadSheetData(sheetName, true);
          showSuccessAlert(
            response.message ||
              (response.data && response.data.message) ||
              "Data berhasil dihapus!"
          );
        } else if (response && response.error) {
          showErrorAlert(response.error);
        }
      }
    });
  };

  if (saveButton) {
    saveButton.addEventListener("click", async () => {
      const sheet = currentEditSheetName;
      const gasRowIndexForUpdate = currentEditItemIdForGAS;
      if (!sheet) {
        showErrorAlert("Kesalahan: Nama sheet tidak ditentukan.");
        return;
      }
      const columns = sheetColumns[sheet];
      if (!columns) {
        showErrorAlert(
          `Kesalahan konfigurasi: Kolom untuk sheet '${sheet}' tidak ditemukan.`
        );
        return;
      }
      const formData = new FormData(editForm);
      const rowDataArray = columns.map((col) => formData.get(col));
      const payloadForHapi = { rowData: rowDataArray };
      console.log("Saving data:", {
        sheet,
        gasRowIndexForUpdate,
        payload: payloadForHapi,
      });
      let response;
      if (gasRowIndexForUpdate) {
        response = await callHapiGasProxyApi(
          "PUT",
          sheet,
          payloadForHapi,
          gasRowIndexForUpdate
        );
      } else {
        response = await callHapiGasProxyApi("POST", sheet, payloadForHapi);
      }
      if (
        (response &&
          response.success !== false &&
          response.status !== "error" &&
          response.message) ||
        (response && response.data && response.data.status === "success")
      ) {
        if (editModal) editModal.hide();
        loadSheetData(sheet, true);
        showSuccessAlert(
          response.message ||
            (response.data && response.data.message) ||
            "Data berhasil disimpan!"
        );
      } else if (response && response.error) {
        showErrorAlert(response.error);
      }
    });
  }

  async function uploadCredentials() {
    if (
      !credentialsInput ||
      !credentialsInput.files ||
      credentialsInput.files.length === 0
    ) {
      showWarningAlert("Pilih file credentials (.json) terlebih dahulu.");
      return;
    }
    const file = credentialsInput.files[0];
    if (!file.name.toLowerCase().endsWith(".json")) {
      showErrorAlert("Hanya file .json yang diizinkan.");
      return;
    }
    if (credentialsUploadStatus)
      credentialsUploadStatus.textContent = "Mengunggah credentials...";
    Swal.fire({
      title: "Mengunggah Kredensial",
      text: "Harap tunggu...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });
    const formData = new FormData();
    formData.append("credentialsFile", file);
    try {
      const response = await fetch(
        `${HAPI_SERVER_URL}/api/config/credentials`,
        { method: "POST", body: formData }
      );
      const result = await response.json();
      Swal.close();
      if (!response.ok)
        throw new Error(
          result.error || `Gagal mengunggah credentials: ${response.statusText}`
        );
      if (credentialsUploadStatus)
        credentialsUploadStatus.textContent =
          result.message || "Kredensial berhasil diunggah!";
      showSuccessAlert(result.message || "Kredensial berhasil diunggah!");
      credentialsInput.value = "";
      await fetchAppConfig();
    } catch (error) {
      Swal.close();
      console.error("Error uploading credentials:", error);
      if (credentialsUploadStatus)
        credentialsUploadStatus.textContent = `Error: ${error.message}`;
      showErrorAlert(`Error mengunggah credentials: ${error.message}`);
    }
  }

  async function deleteServerCredentials() {
    Swal.fire({
      title: "Hapus Kredensial di Server?",
      text: "Anda yakin?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Ya, hapus!",
      cancelButtonText: "Batal",
    }).then(async (result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: "Menghapus Kredensial",
          text: "Harap tunggu...",
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading(),
        });
        try {
          const response = await fetch(
            `${HAPI_SERVER_URL}/api/config/credentials`,
            { method: "DELETE" }
          );
          const resData = await response.json();
          Swal.close();
          if (!response.ok)
            throw new Error(
              resData.error ||
                `Gagal menghapus credentials: ${response.statusText}`
            );
          showSuccessAlert(resData.message || "Kredensial berhasil dihapus.");
          await fetchAppConfig();
        } catch (error) {
          Swal.close();
          console.error("Error deleting credentials:", error);
          showErrorAlert(`Gagal menghapus credentials: ${error.message}`);
        }
      }
    });
  }

  function updateCredentialsStatusDisplay(exists, lastModified) {
    if (credentialsFileStatus) {
      let statusText = "";
      if (exists) {
        const dateString = lastModified
          ? new Date(lastModified).toLocaleString("id-ID")
          : "(Tidak diketahui)";
        statusText = `<span class="text-success">File kredensial server: <strong>TERSEDIA</strong>. (Terakhir diubah: ${dateString})</span>`;
      } else {
        statusText = `<span class="text-danger">File kredensial server: <strong>BELUM DIUNGGAH</strong>.</span>`;
      }
      credentialsFileStatus.innerHTML = statusText;
    }
  }

  async function checkCredentialsStatus() {
    if (!credentialsFileStatus) return;
    credentialsFileStatus.innerHTML = "Memeriksa status kredensial server...";
    try {
      const response = await fetch(
        `${HAPI_SERVER_URL}/api/config/credentials-status`
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Gagal memeriksa status.");
      await fetchAppConfig();
    } catch (error) {
      console.warn(
        "Error checking credentials status (likely HAPI unreachable):",
        error
      );
      if (credentialsFileStatus)
        credentialsFileStatus.innerHTML = `<span class="text-danger">Error memeriksa status: Server tidak terjangkau.</span>`;
    }
  }

  if (uploadCredentialsButton)
    uploadCredentialsButton.addEventListener("click", uploadCredentials);
  if (deleteCredentialsButton)
    deleteCredentialsButton.addEventListener("click", deleteServerCredentials);

  async function uploadModelZipAndOptionalLabel(
    modelType,
    modelZipFileInput,
    labelFileInput
  ) {
    const statusEl =
      modelType === "detection"
        ? detectionModelStatus
        : recommendationModelStatus;
    if (
      !modelZipFileInput ||
      !modelZipFileInput.files ||
      modelZipFileInput.files.length === 0
    ) {
      showWarningAlert("Pilih file ZIP model terlebih dahulu.");
      if (statusEl) statusEl.textContent = "Pilih file ZIP model.";
      return;
    }
    const modelFile = modelZipFileInput.files[0];
    const labelFile =
      labelFileInput && labelFileInput.files && labelFileInput.files.length > 0
        ? labelFileInput.files[0]
        : null;
    if (!modelFile.name.toLowerCase().endsWith(".zip")) {
      showErrorAlert("File model harus berupa .zip.");
      if (statusEl) statusEl.textContent = "File model harus .zip.";
      return;
    }
    if (labelFile && !labelFile.name.toLowerCase().endsWith(".json")) {
      showErrorAlert("File label harus berupa .json.");
      if (statusEl) statusEl.textContent = "File label harus .json.";
      return;
    }
    Swal.fire({
      title: `Mengunggah Model ${modelType}`,
      text: "Proses ini mungkin memakan waktu...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });
    if (statusEl) statusEl.textContent = "Mengunggah...";
    const formData = new FormData();
    formData.append("modelFile", modelFile);
    if (labelFile) formData.append("labelFile", labelFile);
    try {
      const response = await fetch(
        `${HAPI_SERVER_URL}/api/upload/${modelType}`,
        { method: "POST", body: formData }
      );
      const result = await response.json();
      Swal.close();
      if (!response.ok)
        throw new Error(
          result.error || `Gagal unggah model: ${response.statusText}`
        );
      showSuccessAlert(
        result.message || `Model ${modelType} berhasil diunggah dan diproses.`
      );
      if (modelZipFileInput) modelZipFileInput.value = "";
      if (labelFileInput) labelFileInput.value = "";
      checkAllModelInfo(modelType);
    } catch (error) {
      Swal.close();
      showErrorAlert(`Error unggah model ${modelType}: ${error.message}`);
      if (statusEl) statusEl.textContent = `Error: ${error.message}`;
    }
  }

  async function uploadSingleAssetForRecommendation(
    assetType,
    assetInput,
    targetApiEndpointName
  ) {
    const infoElMap = {
      "scaler-x": recommendationScalerXInfo,
      "scaler-y": recommendationScalerYInfo,
      metadata: recommendationMetadataInfo,
    };
    const infoEl = infoElMap[targetApiEndpointName];

    if (!assetInput || !assetInput.files || !assetInput.files.length === 0) {
      showWarningAlert(`Pilih file untuk ${assetType} terlebih dahulu.`);
      return;
    }
    const assetFile = assetInput.files[0];

    Swal.fire({
      title: `Mengunggah ${assetType}`,
      text: "Harap tunggu...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });
    if (infoEl) infoEl.innerHTML = `<i>Mengunggah ${assetType}...</i>`;
    const formData = new FormData();
    formData.append("assetFile", assetFile);
    try {
      const response = await fetch(
        `${HAPI_SERVER_URL}/api/upload/recommendation/${targetApiEndpointName}`,
        { method: "POST", body: formData }
      );
      const result = await response.json();
      Swal.close();
      if (!response.ok)
        throw new Error(
          result.error || `Gagal unggah ${assetType}: ${response.statusText}`
        );
      showSuccessAlert(result.message || `${assetType} berhasil diunggah.`);
      if (assetInput) assetInput.value = "";
      checkAllModelInfo("recommendation");
    } catch (error) {
      Swal.close();
      showErrorAlert(`Error unggah ${assetType}: ${error.message}`);
      if (infoEl)
        infoEl.innerHTML = `<span class="text-danger">Error: ${error.message}</span>`;
    }
  }

  async function checkAllModelInfo(modelType) {
    const statusEl =
      modelType === "detection"
        ? detectionModelStatus
        : recommendationModelStatus;
    const contentInfoEl =
      modelType === "detection"
        ? detectionModelContentInfo
        : recommendationModelContentInfo;
    const labelInfoEl =
      modelType === "detection" ? detectionLabelInfo : recommendationLabelInfo;
    const elementsToUpdate = [statusEl, contentInfoEl, labelInfoEl];

    if (modelType === "recommendation") {
      elementsToUpdate.push(
        recommendationScalerXInfo,
        recommendationScalerYInfo,
        recommendationMetadataInfo
      );
    }
    elementsToUpdate.forEach((el) => {
      if (el) el.innerHTML = "<i>Memeriksa...</i>";
    });

    try {
      const response = await fetch(
        `${HAPI_SERVER_URL}/api/models/${modelType}/info`
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error || `Gagal mendapatkan info model ${modelType}.`
        );
      if (statusEl)
        statusEl.textContent =
          result.message || "Status: Info terbaru diambil.";

      const displayAssetInfo = (el, version, path, assetName = "Aset") => {
        if (!el) return;
        let html = `${assetName}: `;
        if (path !== "N/A") {
          html += `Ada (v: <small class="text-muted">${(
            version || "N/A"
          ).substring(0, 12)}...</small>, Path: <small class="text-muted">${
            path || "N/A"
          }</small>)`;
        } else {
          html += "Tidak Ada/Belum Diunggah";
        }
        el.innerHTML = html;
      };

      displayAssetInfo(
        contentInfoEl,
        result.version,
        result.modelJsonPath,
        "Model Inti"
      );
      displayAssetInfo(
        labelInfoEl,
        result.labelJsonVersion,
        result.labelJsonPath,
        "Label"
      );

      if (modelType === "recommendation") {
        displayAssetInfo(
          recommendationScalerXInfo,
          result.scalerXVersion,
          result.scalerXPath,
          "Scaler X"
        );
        displayAssetInfo(
          recommendationScalerYInfo,
          result.scalerYVersion,
          result.scalerYPath,
          "Scaler Y"
        );
        displayAssetInfo(
          recommendationMetadataInfo,
          result.metadataVersion,
          result.metadataPath,
          "Metadata"
        );
      }
    } catch (error) {
      if (statusEl) statusEl.textContent = `Error: ${error.message}`;
      elementsToUpdate.slice(1).forEach((el) => {
        if (el)
          el.innerHTML = `<span class="text-danger">Error: ${error.message}</span>`;
      });
    }
  }

  if (uploadDetectionModelButton)
    uploadDetectionModelButton.addEventListener("click", () =>
      uploadModelZipAndOptionalLabel(
        "detection",
        detectionModelInput,
        detectionLabelInput
      )
    );
  if (checkDetectionModelButton)
    checkDetectionModelButton.addEventListener("click", () =>
      checkAllModelInfo("detection")
    );
  if (uploadRecommendationModelButton)
    uploadRecommendationModelButton.addEventListener("click", () =>
      uploadModelZipAndOptionalLabel(
        "recommendation",
        recommendationModelInput,
        recommendationLabelInput
      )
    );
  if (uploadRecommendationScalerXButton)
    uploadRecommendationScalerXButton.addEventListener("click", () =>
      uploadSingleAssetForRecommendation(
        "Scaler X",
        recommendationScalerXInput,
        "scaler-x"
      )
    );
  if (uploadRecommendationScalerYButton)
    uploadRecommendationScalerYButton.addEventListener("click", () =>
      uploadSingleAssetForRecommendation(
        "Scaler Y",
        recommendationScalerYInput,
        "scaler-y"
      )
    );
  if (uploadRecommendationMetadataButton)
    uploadRecommendationMetadataButton.addEventListener("click", () =>
      uploadSingleAssetForRecommendation(
        "Metadata",
        recommendationMetadataInput,
        "metadata"
      )
    );
  if (checkRecommendationModelButton)
    checkRecommendationModelButton.addEventListener("click", () =>
      checkAllModelInfo("recommendation")
    );

  function updateTrainingImageStats() {
    if (!statTrainingTotal || !statTrainingUnused || !statTrainingUsed) return;
    const total = trainingImageDataCache.length;
    const used = trainingImageDataCache.filter((item) => item.isUsed).length;
    const unused = total - used;
    statTrainingTotal.textContent = total;
    statTrainingUnused.textContent = unused;
    statTrainingUsed.textContent = used;
  }

  function renderTrainingImageUploadChart() {
    if (!trainingImageUploadChartCanvas || !trainingImageChartPlaceholder)
      return;
    const uploadsByDate = trainingImageDataCache.reduce((acc, item) => {
      const dateObj = new Date(item.uploadedAt);
      const year = dateObj.getFullYear();
      const month = (dateObj.getMonth() + 1).toString().padStart(2, "0");
      const day = dateObj.getDate().toString().padStart(2, "0");
      const formattedDate = `${year}-${month}-${day}`;
      acc[formattedDate] = (acc[formattedDate] || 0) + 1;
      return acc;
    }, {});
    const sortedDates = Object.keys(uploadsByDate).sort();
    const labels = sortedDates.map((dateStr) => {
      const [year, month, day] = dateStr.split("-");
      return new Date(year, month - 1, day).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
      });
    });
    const dataCounts = sortedDates.map((date) => uploadsByDate[date]);
    if (labels.length === 0) {
      trainingImageUploadChartCanvas.classList.add("d-none");
      trainingImageChartPlaceholder.classList.remove("d-none");
      if (trainingImageChartInstance) {
        trainingImageChartInstance.destroy();
        trainingImageChartInstance = null;
      }
      return;
    }
    trainingImageUploadChartCanvas.classList.remove("d-none");
    trainingImageChartPlaceholder.classList.add("d-none");
    if (trainingImageChartInstance) trainingImageChartInstance.destroy();
    const ctx = trainingImageUploadChartCanvas.getContext("2d");
    trainingImageChartInstance = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Jumlah Gambar Diunggah",
            data: dataCounts,
            backgroundColor: "rgba(25, 135, 84, 0.6)",
            borderColor: "rgba(25, 135, 84, 1)",
            borderWidth: 1,
            borderRadius: 5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 } },
          x: { grid: { display: false } },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) =>
                ` ${context.dataset.label}: ${context.raw} gambar`,
            },
          },
        },
      },
    });
  }

  async function fetchTrainingData(forceRefresh = false) {
    if (!trainingImageGallery) return;
    if (trainingImageGalleryPlaceholder)
      trainingImageGalleryPlaceholder.textContent =
        "Memuat data gambar latih dari server...";
    if (!forceRefresh && trainingImageDataCache.length > 0) {
      // console.log("Loading training images from cache.");
      renderTrainingDataGallery();
      updateTrainingImageStats();
      renderTrainingImageUploadChart();
      fetchAndDisplayDatasetZips(); // Muat juga daftar ZIP
      return;
    }
    // console.log("Fetching training images from server.");
    trainingImageGallery.innerHTML = "";
    try {
      const response = await fetch(`${HAPI_SERVER_URL}/api/training-data`);
      if (!response.ok)
        throw new Error(`Gagal mengambil data latih: ${response.statusText}`);
      const result = await response.json();
      trainingImageDataCache = result.data || [];
      renderTrainingDataGallery();
      updateTrainingImageStats();
      renderTrainingImageUploadChart();
      fetchAndDisplayDatasetZips(); // Muat juga daftar ZIP
    } catch (error) {
      console.warn(
        "Error fetching training data (likely HAPI unreachable):",
        error
      );
      if (trainingImageGalleryPlaceholder)
        trainingImageGalleryPlaceholder.textContent = `Gagal memuat data gambar latih: ${error.message}.`;
      updateTrainingImageStats();
      renderTrainingImageUploadChart();
      fetchAndDisplayDatasetZips(); // Tetap coba muat daftar ZIP
    }
  }

  function renderTrainingDataGallery() {
    if (!trainingImageGallery) return;
    trainingImageGallery.innerHTML = "";
    if (trainingImageDataCache.length === 0) {
      if (trainingImageGalleryPlaceholder) {
        trainingImageGalleryPlaceholder.textContent =
          "Belum ada gambar latih yang diunggah ke server.";
        trainingImageGalleryPlaceholder.classList.remove("d-none");
      }
      return;
    }
    if (trainingImageGalleryPlaceholder)
      trainingImageGalleryPlaceholder.classList.add("d-none");
    trainingImageDataCache.forEach((item) => {
      const card = document.createElement("div");
      card.className = "col";
      const imageUrl = `${HAPI_SERVER_URL}${item.imageUrl}`;
      card.innerHTML = `
        <div class="card shadow-sm training-image-card ${
          item.isUsed ? "used" : "unused"
        }">
          <img src="${imageUrl}" class="card-img-top" alt="${
        item.foodName || "Gambar Makanan"
      }" onerror="this.src='https://placehold.co/300x200/eee/ccc?text=Error+Load+Image'; this.alt='Gambar tidak dapat dimuat dari server';">
          <div class="card-body">
            <h6 class="card-title">${item.foodName || "Tanpa Nama"}</h6>
            <p class="card-text small text-muted">${
              item.description || "Tidak ada deskripsi."
            }</p>
            <p class="card-text small">Status: <span class="fw-bold ${
              item.isUsed ? "text-secondary" : "text-primary"
            }">${item.isUsed ? "Sudah Dipakai" : "Belum Dipakai"}</span></p>
            <div class="d-flex justify-content-between align-items-center mt-auto pt-2"> <div class="btn-group">
                <button type="button" class="btn btn-sm btn-outline-primary download-training-image" data-url="${imageUrl}" data-filename="${
        item.filename || item.id + ".jpg"
      }" data-id="${item.id}"><i class="bi bi-download"></i> Unduh</button>
                ${
                  !item.isUsed
                    ? `<button type="button" class="btn btn-sm btn-outline-success mark-used-training-image" data-id="${item.id}"><i class="bi bi-check-circle"></i> Tandai Dipakai</button>`
                    : ""
                }
              </div>
              <button type="button" class="btn btn-sm btn-outline-danger delete-training-image" data-id="${
                item.id
              }"><i class="bi bi-trash3-fill"></i> Hapus</button>
            </div>
          </div>
          <div class="card-footer text-muted small">
            ID: ${item.id} <br> Diunggah: ${new Date(
        item.uploadedAt
      ).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
          </div>
        </div>`;
      trainingImageGallery.appendChild(card);
    });
    document.querySelectorAll(".download-training-image").forEach((button) => {
      button.addEventListener("click", function () {
        downloadImageAndMarkUsed(
          this.dataset.url,
          this.dataset.filename,
          this.dataset.id
        );
      });
    });
    document.querySelectorAll(".mark-used-training-image").forEach((button) => {
      button.addEventListener("click", function () {
        markTrainingImageAsUsed(this.dataset.id);
      });
    });
    document.querySelectorAll(".delete-training-image").forEach((button) => {
      button.addEventListener("click", function () {
        deleteTrainingImage(this.dataset.id);
      });
    });
  }

  if (uploadTrainingImageForm) {
    uploadTrainingImageForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      if (!trainingImageFile || !trainingFoodName) return;
      const file = trainingImageFile.files[0];
      const foodName = trainingFoodName.value;
      const description = trainingFoodDescription
        ? trainingFoodDescription.value
        : "";
      if (!file) {
        showWarningAlert("Pilih file gambar terlebih dahulu.");
        return;
      }
      if (!foodName) {
        showWarningAlert("Nama makanan tidak boleh kosong.");
        return;
      }
      Swal.fire({
        title: "Mengunggah Gambar Latih",
        text: "Harap tunggu...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });
      const formData = new FormData();
      formData.append("trainingImage", file);
      formData.append("foodName", foodName);
      formData.append("description", description);
      try {
        const response = await fetch(
          `${HAPI_SERVER_URL}/api/training-data/upload`,
          { method: "POST", body: formData }
        );
        const result = await response.json();
        Swal.close();
        if (!response.ok)
          throw new Error(
            result.error || `Gagal mengunggah: ${response.statusText}`
          );
        showSuccessAlert(result.message || "Gambar latih berhasil diunggah!");
        uploadTrainingImageForm.reset();
        fetchTrainingData(true);
      } catch (error) {
        Swal.close();
        console.error("Error uploading training image:", error);
        showErrorAlert(`Error mengunggah gambar: ${error.message}`);
      }
    });
  }

  async function downloadImageAndMarkUsed(url, filename, imageId) {
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename || "downloaded-image.jpg");
    link.setAttribute("target", "_blank");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showInfoAlert(`Memulai unduhan untuk ${filename}...`);
    setTimeout(async () => {
      if (imageId) {
        const item = trainingImageDataCache.find((img) => img.id === imageId);
        if (item && !item.isUsed) await markTrainingImageAsUsed(imageId, false);
      }
    }, 1000);
  }

  async function markTrainingImageAsUsed(imageId, showConfirmation = true) {
    const processMarking = async () => {
      try {
        const response = await fetch(
          `${HAPI_SERVER_URL}/api/training-data/${imageId}/mark-used`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          }
        );
        const resData = await response.json();
        if (!response.ok)
          throw new Error(
            resData.error || `Gagal menandai: ${response.statusText}`
          );
        if (showConfirmation)
          showSuccessAlert(
            resData.message || "Gambar berhasil ditandai sudah dipakai."
          );
        fetchTrainingData(true);
      } catch (error) {
        console.error("Error marking image as used:", error);
        if (showConfirmation)
          showErrorAlert(`Gagal menandai gambar: ${error.message}`);
        else
          console.warn(`Gagal auto-mark gambar ${imageId}: ${error.message}`);
      }
    };
    if (showConfirmation) {
      Swal.fire({
        title: "Tandai Sudah Dipakai?",
        text: "Anda yakin ingin menandai gambar ini sudah dipakai?",
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#28a745",
        cancelButtonColor: "#6c757d",
        confirmButtonText: "Ya, tandai!",
        cancelButtonText: "Batal",
      }).then(async (result) => {
        if (result.isConfirmed) await processMarking();
      });
    } else {
      await processMarking();
    }
  }

  async function deleteTrainingImage(imageId) {
    Swal.fire({
      title: "Hapus Gambar Ini?",
      text: "Anda yakin ingin menghapus gambar latih ini secara permanen dari server?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Ya, Hapus!",
      cancelButtonText: "Batal",
    }).then(async (result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: "Menghapus Gambar",
          text: "Harap tunggu...",
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading(),
        });
        try {
          const response = await fetch(
            `${HAPI_SERVER_URL}/api/training-data/${imageId}`,
            { method: "DELETE" }
          );
          const resData = await response.json();
          Swal.close();
          if (!response.ok)
            throw new Error(
              resData.error || `Gagal menghapus gambar: ${response.statusText}`
            );
          showSuccessAlert(resData.message || "Gambar latih berhasil dihapus.");
          fetchTrainingData(true);
        } catch (error) {
          Swal.close();
          console.error("Error deleting training image:", error);
          showErrorAlert(`Gagal menghapus gambar: ${error.message}`);
        }
      }
    });
  }

  if (deleteAllUsedButton) {
    deleteAllUsedButton.addEventListener("click", () => {
      Swal.fire({
        title: "Hapus Semua Gambar Sudah Dipakai?",
        text: "Tindakan ini akan menghapus semua gambar yang telah ditandai 'Sudah Dipakai' secara permanen dari server!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Ya, Hapus Semua!",
        cancelButtonText: "Batal",
      }).then(async (result) => {
        if (result.isConfirmed) {
          Swal.fire({
            title: "Menghapus Gambar",
            text: "Harap tunggu...",
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading(),
          });
          try {
            const response = await fetch(
              `${HAPI_SERVER_URL}/api/training-data/used`,
              { method: "DELETE" }
            );
            const resData = await response.json();
            Swal.close();
            if (!response.ok)
              throw new Error(
                resData.error ||
                  `Gagal menghapus gambar: ${response.statusText}`
              );
            showSuccessAlert(
              resData.message ||
                "Semua gambar yang sudah dipakai berhasil dihapus."
            );
            fetchTrainingData(true);
          } catch (error) {
            Swal.close();
            console.error("Error deleting all used training images:", error);
            showErrorAlert(`Gagal menghapus gambar: ${error.message}`);
          }
        }
      });
    });
  }

  // --- Fungsi untuk ZIP Dataset ---
  if (downloadAllUnusedButton) {
    downloadAllUnusedButton.addEventListener("click", async () => {
      const unusedCount = parseInt(statTrainingUnused.textContent || "0");
      if (unusedCount === 0) {
        showInfoAlert(
          "Tidak ada dataset gambar yang belum dipakai untuk di-ZIP."
        );
        return;
      }

      Swal.fire({
        title: "Buat & Unduh ZIP?",
        text: `Anda akan membuat arsip ZIP dari ${unusedCount} gambar yang belum dipakai. Gambar-gambar ini akan ditandai sebagai 'Sudah Dipakai' setelah proses ZIP selesai. Lanjutkan?`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Ya, Buat & Unduh!",
        cancelButtonText: "Batal",
        showLoaderOnConfirm: true,
        preConfirm: async () => {
          try {
            const response = await fetch(
              `${HAPI_SERVER_URL}/api/training-data/download-unused-zip`
            );
            if (!response.ok) {
              const errorData = await response.json().catch(() => ({
                error: `Gagal membuat ZIP: ${response.statusText}`,
              }));
              throw new Error(
                errorData.error ||
                  errorData.message ||
                  `Server error: ${response.status}`
              );
            }
            // Jika respons OK, server akan mengirim file ZIP
            // Browser akan menangani unduhan secara otomatis
            const blob = await response.blob();
            const contentDisposition = response.headers.get(
              "content-disposition"
            );
            let filename = "unused_dataset.zip";
            if (contentDisposition) {
              const filenameMatch =
                contentDisposition.match(/filename="?(.+)"?/i);
              if (filenameMatch && filenameMatch.length === 2)
                filename = filenameMatch[1];
            }
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            return { success: true, filename: filename };
          } catch (error) {
            Swal.showValidationMessage(`Permintaan gagal: ${error.message}`);
            return { success: false, error: error.message };
          }
        },
        allowOutsideClick: () => !Swal.isLoading(),
      }).then((result) => {
        if (result.isConfirmed && result.value && result.value.success) {
          showSuccessAlert(
            `File ZIP '${result.value.filename}' berhasil dibuat dan diunduh. Gambar telah ditandai sebagai sudah dipakai.`
          );
          fetchTrainingData(true); // Muat ulang data galeri dan statistik
          fetchAndDisplayDatasetZips(); // Muat ulang daftar ZIP
        } else if (
          result.isConfirmed &&
          result.value &&
          !result.value.success
        ) {
          showErrorAlert(
            `Gagal membuat atau mengunduh ZIP: ${
              result.value.error || "Terjadi kesalahan tidak diketahui."
            }`
          );
        }
      });
    });
  }

  async function fetchAndDisplayDatasetZips() {
    if (!datasetZipList || !datasetZipListPlaceholder) return;
    datasetZipListPlaceholder.textContent = "Memuat daftar arsip ZIP...";
    datasetZipListPlaceholder.classList.remove("d-none");
    datasetZipList.innerHTML = "";

    try {
      const response = await fetch(`${HAPI_SERVER_URL}/api/training-data/zips`);
      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Gagal mengambil daftar ZIP." }));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }
      const zips = await response.json();

      if (zips.length === 0) {
        datasetZipListPlaceholder.textContent =
          "Belum ada arsip ZIP dataset yang dibuat.";
        return;
      }
      datasetZipListPlaceholder.classList.add("d-none");

      zips.forEach((zip) => {
        const item = document.createElement("div");
        item.className =
          "list-group-item list-group-item-action d-flex justify-content-between align-items-center";

        const fileSize = (zip.size / (1024 * 1024)).toFixed(2); // MB
        const createdAt = new Date(zip.createdAt).toLocaleString("id-ID", {
          dateStyle: "medium",
          timeStyle: "short",
        });

        item.innerHTML = `
                <div>
                    <h6 class="mb-1">${zip.filename}</h6>
                    <small class="text-muted">Ukuran: ${fileSize} MB | Dibuat: ${createdAt}</small>
                </div>
                <div>
                    <button class="btn btn-sm btn-outline-primary download-zip-button me-2" data-filename="${zip.filename}" title="Unduh ZIP Ini">
                        <i class="bi bi-download"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger delete-zip-button" data-filename="${zip.filename}" title="Hapus ZIP Ini">
                        <i class="bi bi-trash3"></i>
                    </button>
                </div>
            `;
        datasetZipList.appendChild(item);
      });

      document.querySelectorAll(".download-zip-button").forEach((button) => {
        button.addEventListener("click", function () {
          const filename = this.dataset.filename;
          window.open(
            `${HAPI_SERVER_URL}/api/training-data/zips/${filename}`,
            "_blank"
          );
        });
      });

      document.querySelectorAll(".delete-zip-button").forEach((button) => {
        button.addEventListener("click", function () {
          deleteDatasetZip(this.dataset.filename);
        });
      });
    } catch (error) {
      console.error("Error fetching dataset ZIP list:", error);
      datasetZipListPlaceholder.textContent = `Gagal memuat daftar ZIP: ${error.message}`;
      datasetZipListPlaceholder.classList.remove("d-none");
    }
  }

  async function deleteDatasetZip(filename) {
    Swal.fire({
      title: `Hapus Arsip ${filename}?`,
      text: "Anda yakin ingin menghapus file ZIP ini secara permanen dari server?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Ya, Hapus!",
      cancelButtonText: "Batal",
    }).then(async (result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: "Menghapus Arsip ZIP",
          text: "Harap tunggu...",
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading(),
        });
        try {
          const response = await fetch(
            `${HAPI_SERVER_URL}/api/training-data/zips/${filename}`,
            { method: "DELETE" }
          );
          const resData = await response.json();
          Swal.close();
          if (!response.ok)
            throw new Error(
              resData.error ||
                `Gagal menghapus arsip ZIP: ${response.statusText}`
            );
          showSuccessAlert(resData.message || "Arsip ZIP berhasil dihapus.");
          fetchAndDisplayDatasetZips(); // Muat ulang daftar
        } catch (error) {
          Swal.close();
          console.error("Error deleting dataset ZIP:", error);
          showErrorAlert(`Gagal menghapus arsip ZIP: ${error.message}`);
        }
      }
    });
  }

  // --- Tabs Data Spreadsheet ---
  sheetTabs.forEach((tab) => {
    tab.addEventListener("shown.bs.tab", (event) => {
      currentSheet = event.target.dataset.sheet;
      localStorage.setItem("lastActiveSheet", currentSheet);
      loadSheetData(currentSheet, true);
      if (currentSheet === "Scrap_Food_Name_List" && searchInputScrap)
        searchInputScrap.value = "";
      else if (currentSheet === "Cache_Food_Name_List" && searchInputCache)
        searchInputCache.value = "";
      else if (
        currentSheet === "Result_Food_Name_List" &&
        searchInputResultTable
      )
        searchInputResultTable.value = "";
    });
  });

  if (
    saveHapiServerUrlButton &&
    hapiServerUrlInput &&
    hapiConfigModalInstance
  ) {
    saveHapiServerUrlButton.addEventListener("click", async () => {
      const newUrl = hapiServerUrlInput.value.trim();
      if (!newUrl) {
        showWarningAlert("Alamat server Hapi.js tidak boleh kosong.");
        return;
      }
      try {
        new URL(newUrl);
      } catch (e) {
        showErrorAlert("Format URL server Hapi.js tidak valid.");
        return;
      }
      HAPI_SERVER_URL = newUrl;
      localStorage.setItem("hapiServerURL", HAPI_SERVER_URL);
      console.log("Hapi server URL updated to:", HAPI_SERVER_URL);
      showInfoAlert(
        "Alamat server Hapi telah diperbarui. Mencoba menghubungkan kembali..."
      );
      hapiConfigModalInstance.hide();
      const sheetNamesToClear = Object.keys(sheetColumns);
      sheetNamesToClear.forEach((sheetName) => {
        const containerId = `tableContainer${sheetName.split("_")[0]}`;
        const container = document.getElementById(containerId);
        if (container) container.innerHTML = "";
        showLoading(sheetName, true);
      });
      if (regionalNutrientStatsPlaceholder)
        regionalNutrientStatsPlaceholder.textContent = "Memuat...";
      if (regionalNutrientStatsArea) regionalNutrientStatsArea.innerHTML = "";
      [
        detectionModelContentInfo,
        detectionLabelInfo,
        recommendationModelContentInfo,
        recommendationLabelInfo,
        recommendationScalerXInfo,
        recommendationScalerYInfo,
        recommendationMetadataInfo,
      ].forEach((el) => {
        if (el) el.innerHTML = "<i>Menunggu koneksi...</i>";
      });
      if (detectionModelStatus)
        detectionModelStatus.textContent = "Status: Menunggu koneksi...";
      if (recommendationModelStatus)
        recommendationModelStatus.textContent = "Status: Menunggu koneksi...";
      await initializeApp();
    });
  }

  if (settingsModalEl && hapiServerUrlSettingsInput) {
    settingsModalEl.addEventListener("show.bs.modal", () => {
      hapiServerUrlSettingsInput.value = HAPI_SERVER_URL;
      if (gasUrlInput) gasUrlInput.value = serverConfig.gasUrl;
      if (masterSpreadsheetUrlInput)
        masterSpreadsheetUrlInput.value = serverConfig.masterSpreadsheetUrl;
      checkCredentialsStatus();
    });
  }

  async function initializeApp() {
    console.log(
      "Initializing Application with HAPI_SERVER_URL:",
      HAPI_SERVER_URL
    );
    Swal.fire({
      title: "Inisialisasi Aplikasi",
      text: "Menghubungi server dan memuat konfigurasi...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });
    const configFetchStatus = await fetchAppConfig();
    if (configFetchStatus === "CONNECTION_ERROR") {
      Swal.close();
      if (hapiConfigModalInstance && hapiServerUrlInput) {
        showErrorAlert(
          "Tidak dapat terhubung ke server Hapi.js. Silakan periksa konfigurasi alamat server atau koneksi jaringan Anda."
        );
        hapiServerUrlInput.value = HAPI_SERVER_URL;
        hapiConfigModalInstance.show();
      } else {
        showErrorAlert(
          "Kritikal: Modal konfigurasi server Hapi tidak ditemukan. Aplikasi tidak dapat berjalan."
        );
      }
      Object.keys(sheetColumns).forEach((sheetName) => {
        const containerId = `tableContainer${sheetName.split("_")[0]}`;
        const container = document.getElementById(containerId);
        if (container)
          container.innerHTML =
            '<p class="text-center text-danger p-3">Koneksi ke server gagal.</p>';
        showLoading(sheetName, false);
      });
      if (regionalNutrientStatsPlaceholder)
        regionalNutrientStatsPlaceholder.textContent =
          "Koneksi ke server gagal.";
      return;
    } else if (
      configFetchStatus === "SERVER_RESPONDED_ERROR" ||
      !configFetchStatus
    ) {
      Swal.close();
      showErrorAlert(
        "Terjadi kesalahan saat mengambil konfigurasi dari server Hapi. Beberapa fitur mungkin tidak berfungsi atau data tidak dapat dimuat."
      );
    } else {
      Swal.close();
    }
    Swal.fire({
      title: "Memuat Data Awal",
      text: "Mengambil data awal aplikasi...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });
    if (serverConfig.gasUrl) {
      // console.log("GAS URL is configured. Proceeding to load initial data.");
      await loadAllSpreadsheetDataForStats();
    } else {
      console.warn(
        "URL Google Apps Script belum dikonfigurasi di server. Data spreadsheet tidak dapat dimuat."
      );
      Object.keys(sheetColumns).forEach((sheetName) => {
        const containerId = `tableContainer${sheetName.split("_")[0]}`;
        const container = document.getElementById(containerId);
        if (container)
          container.innerHTML =
            '<p class="text-center text-warning p-3">URL GAS belum dikonfigurasi.</p>';
        showLoading(sheetName, false);
      });
      updateSpreadsheetStats();
      if (regionalNutrientStatsPlaceholder)
        regionalNutrientStatsPlaceholder.textContent =
          "URL GAS belum dikonfigurasi.";
    }
    await checkCredentialsStatus();
    Swal.close();
    const initialView = localStorage.getItem("lastActiveView") || "data";
    currentSheet =
      localStorage.getItem("lastActiveSheet") || "Scrap_Food_Name_List";
    if (initialView === "data") {
      const activeSheetTab = document.querySelector(
        `#sheetTabs .nav-link[data-sheet="${currentSheet}"]`
      );
      if (activeSheetTab) {
        sheetTabs.forEach((tab) => tab.classList.remove("active"));
        activeSheetTab.classList.add("active");
        const tabPaneId = activeSheetTab.getAttribute("data-bs-target");
        if (tabPaneId) {
          document
            .querySelectorAll(".tab-content .tab-pane")
            .forEach((pane) => pane.classList.remove("show", "active"));
          const targetPane = document.querySelector(tabPaneId);
          if (targetPane) targetPane.classList.add("show", "active");
        }
      }
    }
    showView(initialView, true);
  }

  initializeApp();
});
