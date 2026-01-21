const fileInput = document.getElementById("fileInput");
const fileName = document.getElementById("fileName");
const guidelineFilterSearch = document.getElementById("guidelineFilterSearch");
const guidelineFilterDropdown = document.getElementById("guidelineFilterDropdown");
const guidelineSelectedChips = document.getElementById("guidelineSelectedChips");
const guidelineFilterWrapper = document.getElementById("guidelineFilterWrapper");
const locationFilterSearch = document.getElementById("locationFilterSearch");
const locationFilterDropdown = document.getElementById("locationFilterDropdown");
const locationSelectedChips = document.getElementById("locationSelectedChips");
const locationFilterWrapper = document.getElementById("locationFilterWrapper");
const tableBody = document.getElementById("tableBody");
const workspaceInput = document.getElementById("workspaceRoot");
const totalCountElement = document.getElementById("totalCount");
const classificationCountsElement = document.getElementById("classificationCounts");
const resetFiltersBtn = document.getElementById("resetFiltersBtn");
const reloadBtn = document.getElementById("reloadBtn");
const summaryTableBody = document.getElementById("summaryTableBody");
const summaryTotalCount = document.getElementById("summaryTotalCount");
const uniqueGuidelinesCount = document.getElementById("uniqueGuidelinesCount");
const locationSummaryTableBody = document.getElementById("locationSummaryTableBody");
const locationTotalCount = document.getElementById("locationTotalCount");
const uniqueLocationsCount = document.getElementById("uniqueLocationsCount");
const violationCombinationsModal = document.getElementById("violationCombinationsModal");
const modalCloseBtn = document.getElementById("modalCloseBtn");
const modalFileName = document.getElementById("modalFileName");
const modalContent = document.getElementById("modalContent");
const comparisonTableBody = document.getElementById("comparisonTableBody");
const newErrorsCount = document.getElementById("newErrorsCount");
const fixedErrorsCount = document.getElementById("fixedErrorsCount");
const movedErrorsCount = document.getElementById("movedErrorsCount");
const totalChangesCount = document.getElementById("totalChangesCount");
const compareStatusFilterSearch = document.getElementById("compareStatusFilterSearch");
const compareStatusFilterDropdown = document.getElementById("compareStatusFilterDropdown");
const compareStatusSelectedChips = document.getElementById("compareStatusSelectedChips");
const compareStatusFilterWrapper = document.getElementById("compareStatusFilterWrapper");
const compareGuidelineFilterSearch = document.getElementById("compareGuidelineFilterSearch");
const compareGuidelineFilterDropdown = document.getElementById("compareGuidelineFilterDropdown");
const compareGuidelineSelectedChips = document.getElementById("compareGuidelineSelectedChips");
const compareGuidelineFilterWrapper = document.getElementById("compareGuidelineFilterWrapper");
const compareFileFilterSearch = document.getElementById("compareFileFilterSearch");
const compareFileFilterDropdown = document.getElementById("compareFileFilterDropdown");
const compareFileSelectedChips = document.getElementById("compareFileSelectedChips");
const compareFileFilterWrapper = document.getElementById("compareFileFilterWrapper");
const resetCompareFiltersBtn = document.getElementById("resetCompareFiltersBtn");
const WORKSPACE_KEY = "cppcheckWorkspaceRoot";

let errors = [];
let baselineErrors = [];
let baselineXmlContent = null;
let currentFile = null;
let allLocations = [];
let filteredErrors = [];
let currentIndex = 0;
const BATCH_SIZE = 50;
let isLoading = false;
let observer = null;
let sortColumn = null;

// Comparison table lazy rendering state
let filteredComparisonChanges = [];
let comparisonCurrentIndex = 0;
const COMPARISON_BATCH_SIZE = 50;
let comparisonIsLoading = false;
let comparisonObserver = null;
let sortDirection = 'asc';
let summarySortColumn = null;
let summarySortDirection = 'asc';
let locationSortColumn = null;
let locationSortDirection = 'asc';

// Multiselect state
let selectedGuidelines = [];
let selectedLocations = [];
let allGuidelines = [];
let allLocationsForMultiselect = [];

// Compare tab multiselect state
let selectedCompareStatus = [];
let selectedCompareGuidelines = [];
let selectedCompareFiles = [];
let allCompareStatus = [];
let allCompareGuidelines = [];
let allCompareFiles = [];

workspaceInput.value = localStorage.getItem(WORKSPACE_KEY) || "";

workspaceInput.addEventListener("input", () => {
  localStorage.setItem(WORKSPACE_KEY, workspaceInput.value.trim());
});

fileInput.addEventListener("change", loadXML);

// Initialize multiselect components
initMultiselect('guideline', guidelineFilterSearch, guidelineFilterDropdown, guidelineSelectedChips, guidelineFilterWrapper);
initMultiselect('location', locationFilterSearch, locationFilterDropdown, locationSelectedChips, locationFilterWrapper);

// Initialize Compare tab multiselect components
if (compareStatusFilterSearch && compareStatusFilterDropdown && compareStatusSelectedChips && compareStatusFilterWrapper) {
  initMultiselect('compareStatus', compareStatusFilterSearch, compareStatusFilterDropdown, compareStatusSelectedChips, compareStatusFilterWrapper);
}
if (compareGuidelineFilterSearch && compareGuidelineFilterDropdown && compareGuidelineSelectedChips && compareGuidelineFilterWrapper) {
  initMultiselect('compareGuideline', compareGuidelineFilterSearch, compareGuidelineFilterDropdown, compareGuidelineSelectedChips, compareGuidelineFilterWrapper);
}
if (compareFileFilterSearch && compareFileFilterDropdown && compareFileSelectedChips && compareFileFilterWrapper) {
  initMultiselect('compareFile', compareFileFilterSearch, compareFileFilterDropdown, compareFileSelectedChips, compareFileFilterWrapper);
}

resetFiltersBtn.addEventListener("click", resetFilters);
if (resetCompareFiltersBtn) {
  resetCompareFiltersBtn.addEventListener("click", resetCompareFilters);
}
reloadBtn.addEventListener("click", reloadFile);

// Baseline file loading
const baselineFileInput = document.getElementById("baselineFileInput");
const baselineFileName = document.getElementById("baselineFileName");

if (baselineFileInput) {
  baselineFileInput.addEventListener("change", loadBaselineXML);
}

// Comparison level slider
const comparisonLevelSlider = document.getElementById("comparisonLevel");

if (comparisonLevelSlider) {
  comparisonLevelSlider.addEventListener("input", (e) => {
    // Re-render comparison table with new level
    if (baselineErrors.length > 0 && errors.length > 0) {
      renderComparisonTable();
    }
  });
}

// Modal close handlers
if (modalCloseBtn) {
  modalCloseBtn.addEventListener("click", () => {
    violationCombinationsModal.style.display = "none";
  });
}

if (violationCombinationsModal) {
  window.addEventListener("click", (event) => {
    if (event.target === violationCombinationsModal) {
      violationCombinationsModal.style.display = "none";
    }
  });
}

// Add sorting functionality to table headers
document.addEventListener('DOMContentLoaded', () => {
  const errorTableHeaders = document.querySelectorAll('#errorsTab table thead th');
  errorTableHeaders.forEach((header, index) => {
    header.style.cursor = 'pointer';
    header.style.userSelect = 'none';
    header.addEventListener('click', () => {
      const columns = ['guideline', 'classification', 'msg', 'file', 'line', 'column'];
      sortTable(columns[index]);
    });
  });

  const summaryTableHeaders = document.querySelectorAll('#summaryTab table thead th');
  summaryTableHeaders.forEach((header, index) => {
    header.style.cursor = 'pointer';
    header.style.userSelect = 'none';
    header.addEventListener('click', () => {
      const columns = ['guideline', 'classification', 'count'];
      sortSummaryTable(columns[index]);
    });
  });

  const locationTableHeaders = document.querySelectorAll('#byLocationTab table thead th');
  locationTableHeaders.forEach((header, index) => {
    header.style.cursor = 'pointer';
    header.style.userSelect = 'none';
    header.addEventListener('click', () => {
      const columns = ['location', 'totalErrors', 'uniqueErrors', 'mandatory', 'required', 'advisory'];
      sortLocationTable(columns[index]);
    });
  });
});

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tabName = btn.getAttribute('data-tab');
    switchTab(tabName);
  });
});

function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}


// Multiselect component initialization
function initMultiselect(type, searchInput, dropdown, chipsContainer, wrapper) {
  let searchQuery = '';
  let isOpen = false;
  
  // Search input handler
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    updateMultiselectDropdown(type, searchQuery);
  });
  
  // Toggle dropdown on input focus/click
  searchInput.addEventListener('focus', () => {
    isOpen = true;
    dropdown.classList.add('show');
    updateMultiselectDropdown(type, searchQuery);
  });
  
  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!wrapper.contains(e.target)) {
      isOpen = false;
      dropdown.classList.remove('show');
    }
  });
  
  // Prevent dropdown from closing when clicking inside
  dropdown.addEventListener('click', (e) => {
    e.stopPropagation();
  });
}

function updateMultiselectDropdown(type, searchQuery = '') {
  let items, selected, dropdown;
  
  if (type === 'guideline') {
    items = allGuidelines;
    selected = selectedGuidelines;
    dropdown = guidelineFilterDropdown;
  } else if (type === 'location') {
    items = allLocationsForMultiselect;
    selected = selectedLocations;
    dropdown = locationFilterDropdown;
  } else if (type === 'compareStatus') {
    items = allCompareStatus;
    selected = selectedCompareStatus;
    dropdown = compareStatusFilterDropdown;
  } else if (type === 'compareGuideline') {
    items = allCompareGuidelines;
    selected = selectedCompareGuidelines;
    dropdown = compareGuidelineFilterDropdown;
  } else if (type === 'compareFile') {
    items = allCompareFiles;
    selected = selectedCompareFiles;
    dropdown = compareFileFilterDropdown;
  }
  
  dropdown.innerHTML = '';
  
  const filtered = items.filter(item => 
    item.toLowerCase().includes(searchQuery)
  );
  
  if (filtered.length === 0) {
    const noResults = document.createElement('div');
    noResults.className = 'multiselect-option';
    noResults.textContent = 'No results found';
    dropdown.appendChild(noResults);
  } else {
    filtered.forEach(item => {
      const option = document.createElement('div');
      option.className = 'multiselect-option';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `${type}-${item}`;
      checkbox.checked = selected.includes(item);
      checkbox.addEventListener('change', () => {
        toggleMultiselectItem(type, item);
      });
      
      const label = document.createElement('label');
      label.className = 'multiselect-option-label';
      label.htmlFor = `${type}-${item}`;
      label.textContent = item;
      
      option.addEventListener('click', (e) => {
        e.preventDefault();
        checkbox.checked = !checkbox.checked;
        checkbox.dispatchEvent(new Event('change'));
      });
      
      option.appendChild(checkbox);
      option.appendChild(label);
      dropdown.appendChild(option);
    });
  }
}

function toggleMultiselectItem(type, item) {
  let selected, chipsContainer, searchInput;
  
  if (type === 'guideline') {
    selected = selectedGuidelines;
    chipsContainer = guidelineSelectedChips;
    searchInput = guidelineFilterSearch;
  } else if (type === 'location') {
    selected = selectedLocations;
    chipsContainer = locationSelectedChips;
    searchInput = locationFilterSearch;
  } else if (type === 'compareStatus') {
    selected = selectedCompareStatus;
    chipsContainer = compareStatusSelectedChips;
    searchInput = compareStatusFilterSearch;
  } else if (type === 'compareGuideline') {
    selected = selectedCompareGuidelines;
    chipsContainer = compareGuidelineSelectedChips;
    searchInput = compareGuidelineFilterSearch;
  } else if (type === 'compareFile') {
    selected = selectedCompareFiles;
    chipsContainer = compareFileSelectedChips;
    searchInput = compareFileFilterSearch;
  }
  
  const index = selected.indexOf(item);
  if (index > -1) {
    selected.splice(index, 1);
  } else {
    selected.push(item);
  }
  
  // Keep search input value so user can select multiple matching items
  const currentSearch = searchInput.value.toLowerCase().trim();
  
  updateMultiselectChips(type);
  updateMultiselectDropdown(type, currentSearch);
  
  // Update the appropriate table
  if (type === 'guideline' || type === 'location') {
    renderTable();
  } else if (type === 'compareStatus' || type === 'compareGuideline' || type === 'compareFile') {
    renderComparisonTable();
  }
}

function updateMultiselectChips(type) {
  let selected, chipsContainer, searchInput;
  
  if (type === 'guideline') {
    selected = selectedGuidelines;
    chipsContainer = guidelineSelectedChips;
    searchInput = guidelineFilterSearch;
  } else if (type === 'location') {
    selected = selectedLocations;
    chipsContainer = locationSelectedChips;
    searchInput = locationFilterSearch;
  } else if (type === 'compareStatus') {
    selected = selectedCompareStatus;
    chipsContainer = compareStatusSelectedChips;
    searchInput = compareStatusFilterSearch;
  } else if (type === 'compareGuideline') {
    selected = selectedCompareGuidelines;
    chipsContainer = compareGuidelineSelectedChips;
    searchInput = compareGuidelineFilterSearch;
  } else if (type === 'compareFile') {
    selected = selectedCompareFiles;
    chipsContainer = compareFileSelectedChips;
    searchInput = compareFileFilterSearch;
  }
  
  chipsContainer.innerHTML = '';
  
  selected.forEach(item => {
    const chip = document.createElement('span');
    chip.className = 'multiselect-chip';
    chip.innerHTML = `
      ${item}
      <button class="multiselect-chip-remove" data-item="${item}">×</button>
    `;
    
    chip.querySelector('.multiselect-chip-remove').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMultiselectItem(type, item);
    });
    
    chipsContainer.appendChild(chip);
  });
  
  // Update dropdown checkboxes
  updateMultiselectDropdown(type, searchInput.value.toLowerCase().trim());
}

function loadXML(event) {
  const file = event.target.files[0];
  if (!file) {
    fileName.textContent = "";
    reloadBtn.style.display = "none";
    return;
  }

  currentFile = file;
  fileName.textContent = file.name;
  reloadBtn.style.display = "inline-block";
  const reader = new FileReader();
  reader.onload = () => {
    resetCompareTab();
    parseXML(reader.result);
  };
  reader.readAsText(file);
}

function reloadFile() {
  if (!currentFile) return;
  
  const reader = new FileReader();
  reader.onload = () => {
    resetCompareTab();
    parseXML(reader.result);
  };
  reader.readAsText(currentFile);
}

function resetCompareTab() {
  // Reset baseline data when reloading main XML
  baselineXmlContent = null;
  baselineErrors = [];
  if (baselineFileName) {
    baselineFileName.textContent = "";
  }
  if (baselineFileInput) {
    baselineFileInput.value = "";
  }
  
  // Clear comparison table immediately
  renderComparisonTable();
}

function loadBaselineXML(event) {
  const file = event.target.files[0];
  if (!file) {
    baselineFileName.textContent = "";
    baselineXmlContent = null;
    baselineErrors = [];
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    baselineXmlContent = reader.result;
    baselineFileName.textContent = file.name;
    parseBaselineXML(baselineXmlContent);
  };
  reader.readAsText(file);
}

function parseBaselineXML(xmlText) {
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlText, "application/xml");

  baselineErrors = Array.from(xml.getElementsByTagName("error"))
    .filter(err =>
      err.hasAttribute("guideline") &&
      err.hasAttribute("classification")
    )
    .map(err => {
      const location = err.getElementsByTagName("location")[0];

      return {
        guideline: err.getAttribute("guideline"),
        classification: err.getAttribute("classification"),
        msg: err.getAttribute("msg"),
        file: location?.getAttribute("file") || "",
        line: location?.getAttribute("line") || "",
        column: location?.getAttribute("column") || ""
      };
    });

  console.log(`Baseline XML loaded: ${baselineErrors.length} errors`);
  
  // Render comparison if we have current errors
  if (errors.length > 0) {
    renderComparisonTable();
  }
}

function parseXML(xmlText) {
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlText, "application/xml");

  // Store current filter values
  const savedGuidelines = [...selectedGuidelines];
  const savedLocations = [...selectedLocations];

  errors = Array.from(xml.getElementsByTagName("error"))
    .filter(err =>
      err.hasAttribute("guideline") &&
      err.hasAttribute("classification")
    )
    .map(err => {
      const location = err.getElementsByTagName("location")[0];

      return {
        guideline: err.getAttribute("guideline"),
        classification: err.getAttribute("classification"),
        msg: err.getAttribute("msg"),
        file: location?.getAttribute("file") || "",
        line: location?.getAttribute("line") || "",
		column: location?.getAttribute("column") || ""
      };
    });

  populateFilters();
  
  // Show Compare tab now that XML is loaded
  const compareTabBtn = document.querySelector('.compare-tab-btn');
  if (compareTabBtn) {
    compareTabBtn.style.display = 'inline-block';
  }
  
  // Restore filter values if they still exist in the new data
  selectedGuidelines = savedGuidelines.filter(g => allGuidelines.includes(g));
  selectedLocations = savedLocations.filter(l => allLocationsForMultiselect.includes(l));
  
  // Update chips and dropdowns
  updateMultiselectChips('guideline');
  updateMultiselectChips('location');
  updateMultiselectDropdown('guideline', guidelineFilterSearch.value.toLowerCase().trim());
  updateMultiselectDropdown('location', locationFilterSearch.value.toLowerCase().trim());
  
  renderTable();
}

function populateFilters() {
  allGuidelines = [...new Set(errors.map(e => e.guideline))].sort(compareGuidelines);
  allLocations = [...new Set(errors.map(e => e.file))].sort();
  allLocationsForMultiselect = [...allLocations];
  
  // Update multiselect dropdowns
  updateMultiselectDropdown('guideline', guidelineFilterSearch.value.toLowerCase().trim());
  updateMultiselectDropdown('location', locationFilterSearch.value.toLowerCase().trim());
  
  // Update chips
  updateMultiselectChips('guideline');
  updateMultiselectChips('location');
}

function renderTable() {
  tableBody.innerHTML = "";

  // Disconnect previous observer
  if (observer) {
    observer.disconnect();
  }

  // Filter errors - support multiple selections
  filteredErrors = errors.filter(e =>
    (selectedGuidelines.length === 0 || selectedGuidelines.includes(e.guideline)) &&
    (selectedLocations.length === 0 || selectedLocations.includes(e.file))
  );

  // Apply sorting if a column is selected
  if (sortColumn) {
    applySorting();
  }

  // Update filter options based on current filters
  updateFilterOptions();

  // Update statistics
  updateStatistics();

  // Reset index
  currentIndex = 0;

  // Setup intersection observer for lazy loading BEFORE loading rows
  setupLazyLoading();

  // Load initial batch
  loadMoreRows();
  
  // Also update summary table
  renderSummaryTable();
  renderLocationSummaryTable();
}

function updateFilterOptions() {
  // Get available guidelines based on current location filters
  const availableGuidelines = [...new Set(
    errors
      .filter(e => 
        (selectedLocations.length === 0 || selectedLocations.includes(e.file))
      )
      .map(e => e.guideline)
  )].sort(compareGuidelines);

  // Get available locations based on current guideline filters
  const availableLocations = [...new Set(
    errors
      .filter(e => 
        (selectedGuidelines.length === 0 || selectedGuidelines.includes(e.guideline))
      )
      .map(e => e.file)
  )].sort();

  // Update multiselect options
  allGuidelines = availableGuidelines;
  allLocationsForMultiselect = availableLocations;
  
  // Update dropdowns with current search queries
  updateMultiselectDropdown('guideline', guidelineFilterSearch.value.toLowerCase().trim());
  updateMultiselectDropdown('location', locationFilterSearch.value.toLowerCase().trim());
  
  // Remove selections that are no longer available
  selectedGuidelines = selectedGuidelines.filter(g => allGuidelines.includes(g));
  selectedLocations = selectedLocations.filter(l => allLocationsForMultiselect.includes(l));
  
  // Update chips
  updateMultiselectChips('guideline');
  updateMultiselectChips('location');
}

function updateStatistics() {
  // Update total count
  totalCountElement.textContent = filteredErrors.length;

  // Calculate classification counts
  const classificationCounts = {};
  filteredErrors.forEach(e => {
    const classification = e.classification || "Unknown";
    classificationCounts[classification] = (classificationCounts[classification] || 0) + 1;
  });

  // Sort classifications alphabetically
  const sortedClassifications = Object.keys(classificationCounts).sort();

  // Display classification counts
  classificationCountsElement.innerHTML = sortedClassifications
    .map(classification => `
      <div class="classification-stat">
        <span class="stat-label">${classification}</span>
        <span class="stat-value">${classificationCounts[classification]}</span>
      </div>
    `)
    .join("");
}

function loadMoreRows() {
  if (isLoading || currentIndex >= filteredErrors.length) return;

  isLoading = true;
  const endIndex = Math.min(currentIndex + BATCH_SIZE, filteredErrors.length);
  
  for (let i = currentIndex; i < endIndex; i++) {
    const e = filteredErrors[i];
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${e.guideline}
      <a href="https://www.mathworks.com/help/bugfinder/ref/misrac2023rule${e.guideline}.html" target="_blank">C</a>
      <a href="https://www.mathworks.com/help/bugfinder/ref/misracpp2023rule${e.guideline}.html" target="_blank">C++</a>
      </td>
      <td>${e.classification}</td>
      <td>${e.msg}</td>
      <td>
        ${
          vscodeLink(e.file, e.line, e.column)
            ? `<a href="${vscodeLink(e.file, e.line, e.column)}">${e.file}</a>`
            : e.file
        }
      </td>
      <td>
        ${
          vscodeLink(e.file, e.line, e.column)
            ? `<a href="${vscodeLink(e.file, e.line, e.column)}">${e.line}</a>`
            : e.line
        }
      </td>
		<td>
        ${
          vscodeLink(e.file, e.line, e.column)
            ? `<a href="${vscodeLink(e.file, e.line, e.column)}">${e.column}</a>`
            : e.column
        }
      </td>
    `;
    tableBody.appendChild(row);
  }

  currentIndex = endIndex;
  isLoading = false;

  // If there are more rows, add sentinel
  if (currentIndex < filteredErrors.length) {
    addSentinel();
  }
}

function setupLazyLoading() {
  observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const sentinel = entry.target;
        observer.unobserve(sentinel);
        sentinel.remove();
        loadMoreRows();
      }
    });
  }, {
    root: null,
    rootMargin: '200px',
    threshold: 0.1
  });
}

function addSentinel() {
  const sentinel = document.createElement('tr');
  sentinel.className = 'sentinel-row';
  sentinel.innerHTML = '<td colspan="6" style="text-align:center;padding:20px;">Loading more...</td>';
  tableBody.appendChild(sentinel);
  
  if (observer) {
    observer.observe(sentinel);
  }
}

function setupComparisonLazyLoading() {
  comparisonObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const sentinel = entry.target;
        comparisonObserver.unobserve(sentinel);
        sentinel.remove();
        loadMoreComparisonRows();
      }
    });
  }, {
    root: null,
    rootMargin: '200px',
    threshold: 0.1
  });
}

function addComparisonSentinel() {
  const sentinel = document.createElement('tr');
  sentinel.className = 'sentinel-row';
  sentinel.innerHTML = '<td colspan="7" style="text-align:center;padding:20px;">Loading more...</td>';
  comparisonTableBody.appendChild(sentinel);
  
  if (comparisonObserver) {
    comparisonObserver.observe(sentinel);
  }
}

function loadMoreComparisonRows() {
  if (comparisonIsLoading || comparisonCurrentIndex >= filteredComparisonChanges.length) return;

  comparisonIsLoading = true;
  const endIndex = Math.min(comparisonCurrentIndex + COMPARISON_BATCH_SIZE, filteredComparisonChanges.length);
  
  for (let i = comparisonCurrentIndex; i < endIndex; i++) {
    const item = filteredComparisonChanges[i];
    
    // Render file header if this is the first item of a new file group
    if (i === 0 || filteredComparisonChanges[i - 1].file !== item.file) {
      const file = item.file;
      // Count errors in this file group
      const fileErrors = filteredComparisonChanges.filter(e => e.file === file);
      const newCount = fileErrors.filter(e => e.status === 'new').length;
      const fixedCount = fileErrors.filter(e => e.status === 'fixed').length;
      const movedCount = fileErrors.filter(e => e.status === 'moved').length;
      
      // Add file header row
      const headerRow = document.createElement('tr');
      headerRow.className = 'file-group-header';
      const fileLink = vscodeLink(file);
      headerRow.innerHTML = `
        <td colspan="7">
          <strong>
            ${fileLink ? `<a href="${fileLink}">${file}</a>` : file}
          </strong>
          <span class="file-stats">
            ${newCount > 0 ? `<span class="status-badge status-new">${newCount} NEW</span>` : ''}
            ${fixedCount > 0 ? `<span class="status-badge status-fixed">${fixedCount} FIXED</span>` : ''}
            ${movedCount > 0 ? `<span class="status-badge status-moved">${movedCount} MOVED</span>` : ''}
          </span>
        </td>
      `;
      comparisonTableBody.appendChild(headerRow);
    }
    
    // Render error row
    const error = item;
    const row = document.createElement('tr');
    
    if (error.status === 'moved') {
      const lineDisplay = error.oldLine === error.newLine ? error.newLine : `${error.oldLine}-${error.newLine}`;
      const columnDisplay = error.oldColumn === error.newColumn ? error.newColumn : `${error.oldColumn}-${error.newColumn}`;
      
      row.innerHTML = `
        <td><span class="status-badge status-moved">MOVED</span></td>
        <td>${error.guideline}
        <a href="https://www.mathworks.com/help/bugfinder/ref/misrac2023rule${error.guideline}.html" target="_blank">C</a>
        <a href="https://www.mathworks.com/help/bugfinder/ref/misracpp2023rule${error.guideline}.html" target="_blank">C++</a>
        </td>
        <td>${error.classification}</td>
        <td>${error.msg}</td>
        <td>
          ${
            vscodeLink(error.file, error.newLine, error.newColumn)
              ? `<a href="${vscodeLink(error.file, error.newLine, error.newColumn)}">${error.file}</a>`
              : error.file
          }
        </td>
        <td>
          ${
            vscodeLink(error.file, error.newLine, error.newColumn)
              ? `<a href="${vscodeLink(error.file, error.newLine, error.newColumn)}">${lineDisplay}</a>`
              : lineDisplay
          }
        </td>
        <td>
          ${
            vscodeLink(error.file, error.newLine, error.newColumn)
              ? `<a href="${vscodeLink(error.file, error.newLine, error.newColumn)}">${columnDisplay}</a>`
              : columnDisplay
          }
        </td>
      `;
    } else {
      const statusClass = error.status === 'new' ? 'status-new' : 'status-fixed';
      const statusText = error.status === 'new' ? 'NEW' : 'FIXED';
      
      row.innerHTML = `
        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
        <td>${error.guideline}
        <a href="https://www.mathworks.com/help/bugfinder/ref/misrac2023rule${error.guideline}.html" target="_blank">C</a>
        <a href="https://www.mathworks.com/help/bugfinder/ref/misracpp2023rule${error.guideline}.html" target="_blank">C++</a>
        </td>
        <td>${error.classification}</td>
        <td>${error.msg}</td>
        <td>
          ${
            vscodeLink(error.file, error.line, error.column)
              ? `<a href="${vscodeLink(error.file, error.line, error.column)}">${error.file}</a>`
              : error.file
          }
        </td>
        <td>
          ${
            vscodeLink(error.file, error.line, error.column)
              ? `<a href="${vscodeLink(error.file, error.line, error.column)}">${error.line}</a>`
              : error.line
          }
        </td>
        <td>
          ${
            vscodeLink(error.file, error.line, error.column)
              ? `<a href="${vscodeLink(error.file, error.line, error.column)}">${error.column}</a>`
              : error.column
          }
        </td>
      `;
    }
    comparisonTableBody.appendChild(row);
  }

  comparisonCurrentIndex = endIndex;
  comparisonIsLoading = false;

  // If there are more rows, add sentinel
  if (comparisonCurrentIndex < filteredComparisonChanges.length) {
    addComparisonSentinel();
  }
}

function compareGuidelines(a, b) {
  const aParts = a.split('.').map(Number);
  const bParts = b.split('.').map(Number);

  const len = Math.max(aParts.length, bParts.length);

  for (let i = 0; i < len; i++) {
    const av = aParts[i] ?? 0;
    const bv = bParts[i] ?? 0;

    if (av !== bv) {
      return av - bv;
    }
  }
  return 0;
}

function vscodeLink(file, line, column) {
  if (!file) return "";

  const root = workspaceInput.value.trim();
  if (!root) return "";

  const normalizedRoot = root.replace(/\\/g, "/");
  const normalizedFile = file.replace(/\\/g, "/");

  const fullPath = file.startsWith("/")
    ? normalizedFile
    : `${normalizedRoot}/${normalizedFile}`;

  return `vscode://file/${fullPath}${line ? ':' + line : ''}${column ? ':' + column : ''}`;
}

function resetFilters() {
  selectedGuidelines = [];
  selectedLocations = [];
  
  // Restore all options
  allGuidelines = [...new Set(errors.map(e => e.guideline))].sort(compareGuidelines);
  allLocationsForMultiselect = [...new Set(errors.map(e => e.file))].sort();
  
  // Clear search inputs
  guidelineFilterSearch.value = "";
  locationFilterSearch.value = "";
  
  // Update chips and dropdowns
  updateMultiselectChips('guideline');
  updateMultiselectChips('location');
  updateMultiselectDropdown('guideline', '');
  updateMultiselectDropdown('location', '');
  
  // Re-render the table with no filters applied
  renderTable();
}

function resetCompareFilters() {
  selectedCompareStatus = ['NEW', 'FIXED'];
  selectedCompareGuidelines = [];
  selectedCompareFiles = [];
  
  // Restore all options
  updateCompareFilterOptions();
  
  // Clear search inputs
  if (compareStatusFilterSearch) compareStatusFilterSearch.value = "";
  if (compareGuidelineFilterSearch) compareGuidelineFilterSearch.value = "";
  if (compareFileFilterSearch) compareFileFilterSearch.value = "";
  
  // Update chips and dropdowns
  updateMultiselectChips('compareStatus');
  updateMultiselectChips('compareGuideline');
  updateMultiselectChips('compareFile');
  updateMultiselectDropdown('compareStatus', '');
  updateMultiselectDropdown('compareGuideline', '');
  updateMultiselectDropdown('compareFile', '');
  
  // Re-render the comparison table with no filters applied
  renderComparisonTable();
}

function switchTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    if (btn.getAttribute('data-tab') === tabName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  
  // Update tab content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });
  
  if (tabName === 'errors') {
    document.getElementById('errorsTab').classList.add('active');
  } else if (tabName === 'summary') {
    document.getElementById('summaryTab').classList.add('active');
  } else if (tabName === 'byLocation') {
    document.getElementById('byLocationTab').classList.add('active');
  } else if (tabName === 'compare') {
    document.getElementById('compareTab').classList.add('active');
  }
}

function sortSummaryTable(column) {
  if (summarySortColumn === column) {
    summarySortDirection = summarySortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    summarySortColumn = column;
    summarySortDirection = 'asc';
  }
  updateSummarySortIndicators();
  renderSummaryTable();
}

function updateSummarySortIndicators() {
  const columns = ['guideline', 'classification', 'count'];
  const summaryTableHeaders = document.querySelectorAll('#summaryTab table thead th');
  
  summaryTableHeaders.forEach((header, index) => {
    header.textContent = header.textContent.replace(/ ▲| ▼/g, '');
    if (columns[index] === summarySortColumn) {
      header.textContent += summarySortDirection === 'asc' ? ' ▲' : ' ▼';
    }
  });
}

function renderSummaryTable() {
  // Calculate counts and classification for each guideline from ALL errors (no filters)
  const guidelineData = {};
  errors.forEach(e => {
    const guideline = e.guideline;
    if (!guidelineData[guideline]) {
      guidelineData[guideline] = {
        count: 0,
        classification: e.classification
      };
    }
    guidelineData[guideline].count++;
  });
  
  // Sort guidelines
  let sortedGuidelines = Object.keys(guidelineData);
  
  if (summarySortColumn) {
    sortedGuidelines.sort((a, b) => {
      let aVal, bVal;
      
      if (summarySortColumn === 'guideline') {
        const comparison = compareGuidelines(a, b);
        return summarySortDirection === 'asc' ? comparison : -comparison;
      } else if (summarySortColumn === 'count') {
        aVal = guidelineData[a].count;
        bVal = guidelineData[b].count;
      } else if (summarySortColumn === 'classification') {
        aVal = guidelineData[a].classification.toLowerCase();
        bVal = guidelineData[b].classification.toLowerCase();
      }
      
      if (aVal < bVal) return summarySortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return summarySortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  } else {
    // Default sort by count descending
    sortedGuidelines.sort((a, b) => {
      return guidelineData[b].count - guidelineData[a].count;
    });
  }
  
  // Update summary statistics
  summaryTotalCount.textContent = errors.length;
  uniqueGuidelinesCount.textContent = sortedGuidelines.length;
  
  // Populate summary table
  summaryTableBody.innerHTML = '';
  sortedGuidelines.forEach(guideline => {
    const data = guidelineData[guideline];
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${guideline}
      <a href="https://www.mathworks.com/help/bugfinder/ref/misrac2023rule${guideline}.html" target="_blank">C</a>
      <a href="https://www.mathworks.com/help/bugfinder/ref/misracpp2023rule${guideline}.html" target="_blank">C++</a>
      </td>
      <td>${data.classification}</td>
      <td>${data.count}</td>
    `;
    summaryTableBody.appendChild(row);
  });
}

function sortTable(column) {
  // Toggle direction if clicking the same column
  if (sortColumn === column) {
    sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    sortColumn = column;
    sortDirection = 'asc';
  }

  // Update header indicators
  updateSortIndicators();

  // Re-render table with sorting
  renderTable();
}

function updateSortIndicators() {
  const columns = ['guideline', 'classification', 'msg', 'file', 'line', 'column'];
  const errorTableHeaders = document.querySelectorAll('#errorsTab table thead th');
  
  errorTableHeaders.forEach((header, index) => {
    // Remove existing indicators
    header.textContent = header.textContent.replace(/ ▲| ▼/g, '');
    
    // Add indicator for active sort column
    if (columns[index] === sortColumn) {
      header.textContent += sortDirection === 'asc' ? ' ▲' : ' ▼';
    }
  });
}

function applySorting() {
  filteredErrors.sort((a, b) => {
    let aVal = a[sortColumn];
    let bVal = b[sortColumn];

    // Handle numeric columns
    if (sortColumn === 'line' || sortColumn === 'column') {
      aVal = parseInt(aVal) || 0;
      bVal = parseInt(bVal) || 0;
    }
    // Handle guideline sorting with special logic
    else if (sortColumn === 'guideline') {
      const comparison = compareGuidelines(aVal, bVal);
      return sortDirection === 'asc' ? comparison : -comparison;
    }
    // String comparison for other columns
    else {
      aVal = String(aVal).toLowerCase();
      bVal = String(bVal).toLowerCase();
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });
}

function sortLocationTable(column) {
  if (locationSortColumn === column) {
    locationSortDirection = locationSortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    locationSortColumn = column;
    locationSortDirection = 'asc';
  }
  updateLocationSortIndicators();
  renderLocationSummaryTable();
}

function updateLocationSortIndicators() {
  const columns = ['location', 'totalErrors', 'uniqueErrors', 'mandatory', 'required', 'advisory'];
  const locationTableHeaders = document.querySelectorAll('#byLocationTab table thead th');
  
  locationTableHeaders.forEach((header, index) => {
    header.textContent = header.textContent.replace(/ ▲| ▼/g, '');
    if (columns[index] === locationSortColumn) {
      header.textContent += locationSortDirection === 'asc' ? ' ▲' : ' ▼';
    }
  });
}

function renderLocationSummaryTable() {
  // Calculate statistics for each location from ALL errors (no filters)
  const locationStats = {};
  
  errors.forEach(e => {
    const location = e.file;
    if (!locationStats[location]) {
      locationStats[location] = {
        totalErrors: 0,
        uniqueErrors: new Set(),
        mandatory: new Set(),
        required: new Set(),
        advisory: new Set()
      };
    }
    locationStats[location].totalErrors++;
    locationStats[location].uniqueErrors.add(e.guideline);
    
    // Track unique errors by classification
    const classification = e.classification?.toLowerCase() || '';
    if (classification === 'mandatory') {
      locationStats[location].mandatory.add(e.guideline);
    } else if (classification === 'required') {
      locationStats[location].required.add(e.guideline);
    } else if (classification === 'advisory') {
      locationStats[location].advisory.add(e.guideline);
    }
  });
  
  // Sort locations
  let sortedLocations = Object.keys(locationStats);
  
  if (locationSortColumn) {
    sortedLocations.sort((a, b) => {
      let aVal, bVal;
      
      if (locationSortColumn === 'location') {
        aVal = a.toLowerCase();
        bVal = b.toLowerCase();
      } else if (locationSortColumn === 'totalErrors') {
        aVal = locationStats[a].totalErrors;
        bVal = locationStats[b].totalErrors;
      } else if (locationSortColumn === 'uniqueErrors') {
        aVal = locationStats[a].uniqueErrors.size;
        bVal = locationStats[b].uniqueErrors.size;
      } else if (locationSortColumn === 'mandatory') {
        aVal = locationStats[a].mandatory.size;
        bVal = locationStats[b].mandatory.size;
      } else if (locationSortColumn === 'required') {
        aVal = locationStats[a].required.size;
        bVal = locationStats[b].required.size;
      } else if (locationSortColumn === 'advisory') {
        aVal = locationStats[a].advisory.size;
        bVal = locationStats[b].advisory.size;
      }
      
      if (aVal < bVal) return locationSortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return locationSortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  } else {
    // Default sort by total errors descending
    sortedLocations.sort((a, b) => {
      return locationStats[b].totalErrors - locationStats[a].totalErrors;
    });
  }
  
  // Update location summary statistics
  locationTotalCount.textContent = errors.length;
  uniqueLocationsCount.textContent = sortedLocations.length;
  
  // Populate location summary table
  locationSummaryTableBody.innerHTML = '';
  sortedLocations.forEach(location => {
    const stats = locationStats[location];
    const row = document.createElement('tr');
    const uniqueErrorCount = stats.uniqueErrors.size;
    const mandatoryCount = stats.mandatory.size;
    const requiredCount = stats.required.size;
    const advisoryCount = stats.advisory.size;
    
    const fileLink = vscodeLink(location);
    
    row.innerHTML = `
      <td>
        ${
          fileLink
            ? `<a href="${fileLink}">${location}</a>`
            : location
        }
      </td>
      <td class="total-errors-clickable" data-location="${location}" style="cursor: pointer; color: var(--primary-color); text-decoration: underline;">${stats.totalErrors}</td>
      <td>${uniqueErrorCount}</td>
      <td>${mandatoryCount > 0 ? mandatoryCount : '-'}</td>
      <td>${requiredCount > 0 ? requiredCount : '-'}</td>
      <td>${advisoryCount > 0 ? advisoryCount : '-'}</td>
    `;
    locationSummaryTableBody.appendChild(row);
    
    // Add click handler for Total Errors
    const totalErrorsCell = row.querySelector('.total-errors-clickable');
    totalErrorsCell.addEventListener('click', () => {
      showViolationCombinationsModal(location);
    });
  });
}

function showViolationCombinationsModal(location) {
  // Get all errors for this location
  const locationErrors = errors.filter(e => e.file === location);
  
  // Group errors by line number
  const errorsByLine = {};
  locationErrors.forEach(error => {
    const line = error.line || 'unknown';
    if (!errorsByLine[line]) {
      errorsByLine[line] = [];
    }
    errorsByLine[line].push(error.guideline);
  });
  
  // Filter to only lines with more than one error and create unique combinations
  const combinationCounts = {};
  
  Object.keys(errorsByLine).forEach(line => {
    const guidelines = errorsByLine[line];
    if (guidelines.length > 1) {
      // Create a sorted, unique combination key
      const uniqueGuidelines = [...new Set(guidelines)].sort(compareGuidelines);
      const combinationKey = uniqueGuidelines.join(' + ');
      
      if (!combinationCounts[combinationKey]) {
        combinationCounts[combinationKey] = 0;
      }
      combinationCounts[combinationKey]++;
    }
  });
  
  // Convert to array and sort by count (descending)
  const combinations = Object.entries(combinationCounts)
    .map(([combination, count]) => ({ combination, count }))
    .sort((a, b) => b.count - a.count);
  
  // Update modal content
  modalFileName.textContent = `Violation Combinations - ${location}`;
  
  if (combinations.length === 0) {
    modalContent.innerHTML = '<p>No lines with multiple violations found in this file.</p>';
  } else {
    let html = '<table class="modal-table"><thead><tr><th>Violation Combination</th><th>Lines Count</th></tr></thead><tbody>';
    combinations.forEach(({ combination, count }) => {
      html += `<tr><td>${combination}</td><td>${count}</td></tr>`;
    });
    html += '</tbody></table>';
    modalContent.innerHTML = html;
  }
  
  // Show modal
  violationCombinationsModal.style.display = "block";
}

// Comparison functions
function createErrorKey(error) {
  // Create a unique key for each error based on guideline, file, line, and column
  return `${error.guideline}|${error.file}|${error.line}|${error.column}`;
}

function renderComparisonTable() {
  if (!comparisonTableBody) return;
  
  // Clear the table
  comparisonTableBody.innerHTML = '';
  
  // Disconnect previous observer
  if (comparisonObserver) {
    comparisonObserver.disconnect();
  }
  
  // If no baseline loaded, show message
  if (baselineErrors.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="7" style="text-align: center; padding: 20px;">Load a baseline XML file to compare changes.</td>';
    comparisonTableBody.appendChild(row);
    
    // Reset statistics
    if (newErrorsCount) newErrorsCount.textContent = '0';
    if (fixedErrorsCount) fixedErrorsCount.textContent = '0';
    if (movedErrorsCount) movedErrorsCount.textContent = '0';
    if (totalChangesCount) totalChangesCount.textContent = '0';
    return;
  }
  
  // Create sets for efficient comparison
  const baselineSet = new Map();
  baselineErrors.forEach(error => {
    const key = createErrorKey(error);
    baselineSet.set(key, error);
  });
  
  const currentSet = new Map();
  errors.forEach(error => {
    const key = createErrorKey(error);
    currentSet.set(key, error);
  });
  
  // Find new errors (in current but not in baseline)
  const newErrors = [];
  currentSet.forEach((error, key) => {
    if (!baselineSet.has(key)) {
      newErrors.push({ ...error, status: 'new' });
    }
  });
  
  // Find fixed errors (in baseline but not in current)
  const fixedErrors = [];
  baselineSet.forEach((error, key) => {
    if (!currentSet.has(key)) {
      fixedErrors.push({ ...error, status: 'fixed' });
    }
  });
  
  // Detect moved errors (same guideline, file, msg, classification but different line/column)
  const movedErrors = [];
  const processedNew = new Set();
  const processedFixed = new Set();

  const sortComparison = (a, b) => {
    // First compare by file
    const fileComp = a.file.localeCompare(b.file);
    if (fileComp !== 0) return fileComp;
    
    // Then by line (ensure numeric comparison)
    const lineA = parseInt(a.newLine || a.line, 10) || 0;
    const lineB = parseInt(b.newLine || b.line, 10) || 0;
    if (lineA !== lineB) return lineA - lineB;
    
    // Then by column (ensure numeric comparison)
    const colA = parseInt(a.newColumn || a.column, 10) || 0;
    const colB = parseInt(b.newColumn || b.column, 10) || 0;
    if (colA !== colB) return colA - colB;
    
    // Finally by guideline
    return compareGuidelines(a.guideline, b.guideline);
  };

  newErrors.sort(sortComparison);
  fixedErrors.sort(sortComparison);

  for (const [newIdx, newError] of newErrors.entries()) {
    if (processedNew.has(newIdx)) continue;
    
    for (const [fixedIdx, fixedError] of fixedErrors.entries()) {
      if (processedFixed.has(fixedIdx)) continue;
      
      // Check if they represent the same violation that moved
      // Get comparison level from slider (1=guideline, 2=guideline+file, 3=guideline+file+lines)
      const comparisonLevel = parseInt(document.getElementById('comparisonLevel')?.value || '2', 10);
      
      let isSameError = false;
      if (comparisonLevel === 1) {
        // Compare by guideline only
        isSameError = newError.guideline === fixedError.guideline;
      } else if (comparisonLevel === 2) {
        // Compare by guideline and file
        isSameError = newError.guideline === fixedError.guideline &&
                      newError.file === fixedError.file;
      } else {
        // Compare by guideline, file, and lines (default)
        isSameError = newError.guideline === fixedError.guideline &&
                      newError.file === fixedError.file &&
                      ((newError.line === fixedError.line && newError.column !== fixedError.column) ||
                       (newError.line !== fixedError.line && newError.column === fixedError.column));
      }
      
      if (isSameError) {
        // Create a moved entry
        movedErrors.push({
          ...newError,
          status: 'moved',
          oldLine: fixedError.line,
          oldColumn: fixedError.column,
          newLine: newError.line,
          newColumn: newError.column
        });
        
        processedNew.add(newIdx);
        processedFixed.add(fixedIdx);

        break;
      }
    }
  }
  
  // Filter out processed errors
  const remainingNewErrors = newErrors.filter((_, idx) => !processedNew.has(idx));
  const remainingFixedErrors = fixedErrors.filter((_, idx) => !processedFixed.has(idx));
  
  // Sort by file first, then line, then column, then guideline

  remainingNewErrors.sort(sortComparison);
  remainingFixedErrors.sort(sortComparison);
  movedErrors.sort(sortComparison);
  
  // Combine changes - sort each file's errors by line
  let allChanges = [...remainingNewErrors, ...remainingFixedErrors, ...movedErrors].sort(sortComparison);
  
  // Update filter options before filtering
  updateCompareFilterOptions(allChanges);
  
  // Apply filters - map display labels back to internal status values
  const statusLabelToValue = {
    'NEW': 'new',
    'FIXED': 'fixed',
    'MOVED': 'moved'
  };
  
  const filteredChanges = allChanges.filter(error => {
    // Map selected status labels to internal values for comparison
    const selectedStatusValues = selectedCompareStatus.map(label => statusLabelToValue[label] || label);
    const statusMatch = selectedCompareStatus.length === 0 || selectedStatusValues.includes(error.status);
    const guidelineMatch = selectedCompareGuidelines.length === 0 || selectedCompareGuidelines.includes(error.guideline);
    const fileMatch = selectedCompareFiles.length === 0 || selectedCompareFiles.includes(error.file);
    return statusMatch && guidelineMatch && fileMatch;
  });
  
  // Update statistics based on filtered results
  const filteredNewCount = filteredChanges.filter(e => e.status === 'new').length;
  const filteredFixedCount = filteredChanges.filter(e => e.status === 'fixed').length;
  const filteredMovedCount = filteredChanges.filter(e => e.status === 'moved').length;
  
  if (newErrorsCount) newErrorsCount.textContent = filteredNewCount;
  if (fixedErrorsCount) fixedErrorsCount.textContent = filteredFixedCount;
  if (movedErrorsCount) movedErrorsCount.textContent = filteredMovedCount;
  if (totalChangesCount) totalChangesCount.textContent = filteredChanges.length;
  
  // Store filtered changes for lazy loading
  filteredComparisonChanges = filteredChanges;
  
  // Reset index
  comparisonCurrentIndex = 0;
  
  // Render rows grouped by file with lazy loading
  if (filteredChanges.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="7" style="text-align: center; padding: 20px;">No changes detected between baseline and current XML.</td>';
    comparisonTableBody.appendChild(row);
  } else {
    // Setup intersection observer for lazy loading BEFORE loading rows
    setupComparisonLazyLoading();
    
    // Load initial batch
    loadMoreComparisonRows();
  }
}

function updateCompareFilterOptions(allChanges = []) {
  // Extract unique values for each filter
  const guidelines = [...new Set(allChanges.map(e => e.guideline))].sort(compareGuidelines);
  const files = [...new Set(allChanges.map(e => e.file))].sort();
  
  // Always include all 3 statuses regardless of what's in the data
  allCompareStatus = ['NEW', 'FIXED', 'MOVED'];
  allCompareGuidelines = guidelines;
  allCompareFiles = files;
  
  // Initialize selectedCompareStatus with 'NEW' and 'FIXED' if not already set
  if (selectedCompareStatus.length === 0) {
    selectedCompareStatus = ['NEW', 'FIXED'];
  }
  
  // Update dropdowns with current search queries
  if (compareStatusFilterSearch && compareStatusFilterDropdown) {
    updateMultiselectDropdown('compareStatus', compareStatusFilterSearch.value.toLowerCase().trim());
  }
  if (compareGuidelineFilterSearch && compareGuidelineFilterDropdown) {
    updateMultiselectDropdown('compareGuideline', compareGuidelineFilterSearch.value.toLowerCase().trim());
  }
  if (compareFileFilterSearch && compareFileFilterDropdown) {
    updateMultiselectDropdown('compareFile', compareFileFilterSearch.value.toLowerCase().trim());
  }
  
  // Remove selections that are no longer available
  selectedCompareStatus = selectedCompareStatus.filter(s => allCompareStatus.includes(s));
  selectedCompareGuidelines = selectedCompareGuidelines.filter(g => allCompareGuidelines.includes(g));
  selectedCompareFiles = selectedCompareFiles.filter(f => allCompareFiles.includes(f));
  
  // Update chips
  updateMultiselectChips('compareStatus');
  updateMultiselectChips('compareGuideline');
  updateMultiselectChips('compareFile');
}

// Toggle filters section collapse/expand
function toggleFilters(filtersSection) {
  filtersSection.classList.toggle('collapsed');
}
