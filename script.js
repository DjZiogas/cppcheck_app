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
const WORKSPACE_KEY = "cppcheckWorkspaceRoot";

let errors = [];
let currentFile = null;
let allLocations = [];
let filteredErrors = [];
let currentIndex = 0;
const BATCH_SIZE = 50;
let isLoading = false;
let observer = null;
let sortColumn = null;
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

workspaceInput.value = localStorage.getItem(WORKSPACE_KEY) || "";

workspaceInput.addEventListener("input", () => {
  localStorage.setItem(WORKSPACE_KEY, workspaceInput.value.trim());
});

fileInput.addEventListener("change", loadXML);

// Initialize multiselect components
initMultiselect('guideline', guidelineFilterSearch, guidelineFilterDropdown, guidelineSelectedChips, guidelineFilterWrapper);
initMultiselect('location', locationFilterSearch, locationFilterDropdown, locationSelectedChips, locationFilterWrapper);

resetFiltersBtn.addEventListener("click", resetFilters);
reloadBtn.addEventListener("click", reloadFile);

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
      const columns = ['location', 'totalErrors', 'uniqueErrors'];
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
  const items = type === 'guideline' ? allGuidelines : allLocationsForMultiselect;
  const selected = type === 'guideline' ? selectedGuidelines : selectedLocations;
  const dropdown = type === 'guideline' ? guidelineFilterDropdown : locationFilterDropdown;
  
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
      label.addEventListener('click', (e) => {
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
  const selected = type === 'guideline' ? selectedGuidelines : selectedLocations;
  const chipsContainer = type === 'guideline' ? guidelineSelectedChips : locationSelectedChips;
  const searchInput = type === 'guideline' ? guidelineFilterSearch : locationFilterSearch;
  
  const index = selected.indexOf(item);
  if (index > -1) {
    selected.splice(index, 1);
  } else {
    selected.push(item);
  }
  
  // Clear search input after selection
  searchInput.value = '';
  
  updateMultiselectChips(type);
  updateMultiselectDropdown(type, '');
  renderTable();
}

function updateMultiselectChips(type) {
  const selected = type === 'guideline' ? selectedGuidelines : selectedLocations;
  const chipsContainer = type === 'guideline' ? guidelineSelectedChips : locationSelectedChips;
  
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
  const searchInput = type === 'guideline' ? guidelineFilterSearch : locationFilterSearch;
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
  reader.onload = () => parseXML(reader.result);
  reader.readAsText(file);
}

function reloadFile() {
  if (!currentFile) return;
  
  const reader = new FileReader();
  reader.onload = () => parseXML(reader.result);
  reader.readAsText(currentFile);
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
  const columns = ['location', 'totalErrors', 'uniqueErrors'];
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
        uniqueErrors: new Set()
      };
    }
    locationStats[location].totalErrors++;
    locationStats[location].uniqueErrors.add(e.guideline);
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
    
    const fileLink = vscodeLink(location);
    
    row.innerHTML = `
      <td>
        ${
          fileLink
            ? `<a href="${fileLink}">${location}</a>`
            : location
        }
      </td>
      <td>${stats.totalErrors}</td>
      <td>${uniqueErrorCount}</td>
    `;
    locationSummaryTableBody.appendChild(row);
  });
}