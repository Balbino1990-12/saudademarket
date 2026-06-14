from pathlib import Path
content = '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Portuguese Specialties - Admin</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="/js/i18n.js"></script>
    <script src="/admin/admin-icons.js"></script>
    <script src="/admin/sidebar.js"></script>
</head>
<body class="min-h-screen bg-slate-50 text-slate-900 font-sans">
    <div class="min-h-screen flex bg-slate-50">
        <div class="sidebar w-[260px] shrink-0" id="sidebar"></div>

        <div class="content ml-[260px] w-[calc(100%-260px)] flex-1 flex flex-col overflow-hidden">
            <div class="content-body flex-1 overflow-y-auto p-6">
                <div class="space-y-6">
                    <div id="alertBox" class="hidden rounded-[32px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700"></div>

                    <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h2 class="text-3xl font-bold text-slate-900" data-i18n="specialties">Specialties</h2>
                        </div>
                        <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <button class="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100" onclick="loadSpecialties()" data-i18n="refresh">Refresh</button>
                            <button class="inline-flex items-center justify-center rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700" onclick="openAddSpecialtyModal()" data-i18n="add_specialty">+ Add Specialty</button>
                        </div>
                    </div>

                    <div class="grid gap-4 xl:grid-cols-[1fr_260px]">
                        <div class="rounded-[32px] border border-slate-200 bg-white p-4 shadow-sm">
                            <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                <div class="relative flex-1">
                                    <input type="text" id="searchInput" placeholder="Search by name..." class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 pr-12 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20" onkeyup="filterSpecialties()">
                                    <button id="searchBtn" onclick="filterSpecialties()" class="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-2xl text-slate-500 transition hover:text-slate-900">
                                        <span class="text-lg">🔍</span>
                                    </button>
                                </div>
                                <select id="categoryFilter" class="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20" onchange="filterSpecialties()">
                                    <option value="">All Categories</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div class="grid gap-4 sm:grid-cols-2">
                        <div class="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm">
                            <div class="text-sm uppercase tracking-[0.24em] text-slate-500" data-i18n="total_specialties">Total Specialties</div>
                            <div id="totalSpecialties" class="mt-3 text-3xl font-semibold text-slate-900">0</div>
                        </div>
                        <div class="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm">
                            <div class="text-sm uppercase tracking-[0.24em] text-slate-500" data-i18n="total_categories">Categories</div>
                            <div id="totalCategories" class="mt-3 text-3xl font-semibold text-slate-900">0</div>
                        </div>
                    </div>

                    <div id="loadingState" class="hidden rounded-[32px] border border-slate-200 bg-white p-6 text-sm text-slate-500" data-i18n="loading">Loading specialties...</div>

                    <div id="emptyState" class="hidden rounded-[32px] border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
                        <h3 class="text-xl font-semibold text-slate-900" data-i18n="no_specialties">No specialties found</h3>
                        <p class="mt-2" data-i18n="add_first_specialty">Click the "Add Specialty" button to create the first entry.</p>
                    </div>

                    <div class="rounded-[32px] border border-slate-200 bg-white shadow-sm overflow-hidden">
                        <div class="overflow-x-auto">
                            <table id="specialtiesTable" class="min-w-[900px] w-full text-sm divide-y divide-slate-200 hidden">
                                <thead class="bg-slate-100 text-slate-700">
                                    <tr>
                                        <th class="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em]" data-i18n="image">Image</th>
                                        <th class="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em]" data-i18n="name_en">Name (EN)</th>
                                        <th class="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em]" data-i18n="category">Category</th>
                                        <th class="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em]" data-i18n="icon">Icon</th>
                                        <th class="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em]" data-i18n="color">Color</th>
                                        <th class="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em]" data-i18n="actions">Actions</th>
                                    </tr>
                                </thead>
                                <tbody id="specialtiesTableBody" class="divide-y divide-slate-200 bg-white"></tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div id="specialtyModal" class="hidden fixed inset-0 bg-slate-900/60 z-[1100] flex items-center justify-center p-6 overflow-y-auto">
        <div class="w-full max-w-3xl rounded-[32px] bg-white shadow-2xl ring-1 ring-slate-200 overflow-y-auto">
            <div class="flex flex-col gap-4 border-b border-slate-200 bg-slate-50 p-6 sm:flex-row sm:items-center sm:justify-between">
                <h3 id="modalTitle" class="text-2xl font-semibold text-slate-900">Add Specialty</h3>
                <button onclick="closeSpecialtyModal()" class="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-200 text-slate-600 transition hover:bg-slate-300 hover:text-slate-900">✖</button>
            </div>
            <form id="specialtyForm" class="space-y-6 p-6" onsubmit="saveSpecialty(event)">
                <input type="hidden" id="specialtyId">
                <div class="grid gap-4 lg:grid-cols-2">
                    <div>
                        <label for="nameEn" class="block text-sm font-semibold text-slate-700 mb-2">Name (English) *</label>
                        <input type="text" id="nameEn" required class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20">
                    </div>
                    <div>
                        <label for="category" class="block text-sm font-semibold text-slate-700 mb-2">Category *</label>
                        <input type="text" id="category" required placeholder="e.g., Oils & Vinegars" class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20">
                    </div>
                </div>

                <div class="grid gap-4 lg:grid-cols-2">
                    <div>
                        <label for="nameFr" class="block text-sm font-semibold text-slate-700 mb-2">Name (French)</label>
                        <input type="text" id="nameFr" class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20">
                    </div>
                    <div>
                        <label for="namePt" class="block text-sm font-semibold text-slate-700 mb-2">Name (Portuguese)</label>
                        <input type="text" id="namePt" class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20">
                    </div>
                </div>

                <div>
                    <label for="description" class="block text-sm font-semibold text-slate-700 mb-2">Description</label>
                    <textarea id="description" placeholder="Detailed information about this specialty..." class="w-full min-h-[112px] rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20"></textarea>
                </div>

                <div class="grid gap-4 lg:grid-cols-2">
                    <div>
                        <label for="image" class="block text-sm font-semibold text-slate-700 mb-2">Image URL</label>
                        <input type="url" id="image" placeholder="https://..." class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20">
                    </div>
                    <div>
                        <label for="icon" class="block text-sm font-semibold text-slate-700 mb-2">Icon (emoji or symbol)</label>
                        <input type="text" id="icon" placeholder="🫒, 🥫, 🍷, etc." maxlength="5" class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20">
                    </div>
                </div>

                <div class="grid gap-4 lg:grid-cols-2">
                    <div>
                        <label for="color" class="block text-sm font-semibold text-slate-700 mb-2">Color</label>
                        <input type="color" id="color" value="#27ae60" class="h-12 w-full rounded-2xl border border-slate-300 bg-white p-2 text-sm outline-none transition focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20">
                    </div>
                    <div>
                        <label for="activeStatus" class="block text-sm font-semibold text-slate-700 mb-2">Active</label>
                        <select id="activeStatus" class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20">
                            <option value="1">Yes</option>
                            <option value="0">No</option>
                        </select>
                    </div>
                </div>

                <div class="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
                    <button type="button" class="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100" onclick="closeSpecialtyModal()">Cancel</button>
                    <button type="submit" class="inline-flex items-center justify-center rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700">Save Specialty</button>
                </div>
            </form>
        </div>
    </div>

    <script>
        // Store all specialties for filtering
        let allSpecialties = [];
        let currentEditId = null;

        async function loadSpecialties() {
            try {
                document.getElementById('loadingState').classList.remove('hidden');
                document.getElementById('specialtiesTable').classList.add('hidden');
                document.getElementById('emptyState').classList.add('hidden');

                const response = await fetch('/api/specialties');
                const result = await response.json();

                if (result.success) {
                    allSpecialties = result.data;
                    displaySpecialties(allSpecialties);
                    updateStats();
                    populateCategoryFilter();
                } else {
                    showAlert('Failed to load specialties', 'error');
                }
            } catch (error) {
                console.error('Load error:', error);
                showAlert('Error loading specialties: ' + error.message, 'error');
            } finally {
                document.getElementById('loadingState').classList.add('hidden');
            }
        }

        function displaySpecialties(specialties) {
            const tbody = document.getElementById('specialtiesTableBody');
            const table = document.getElementById('specialtiesTable');

            if (!specialties || specialties.length === 0) {
                table.classList.add('hidden');
                document.getElementById('emptyState').classList.remove('hidden');
                return;
            }

            tbody.innerHTML = specialties.map(s => `
                <tr class="transition hover:bg-slate-50">
                    <td class="px-5 py-4 align-top">
                        ${s.image ? `<img src="${s.image}" alt="${s.name_en}" class="h-12 w-12 rounded-2xl object-cover">` : '<span class="text-sm text-slate-500">No Image</span>'}
                    </td>
                    <td class="px-5 py-4 align-top">
                        <div class="font-semibold text-slate-900">${s.name_en}</div>
                        ${s.name_fr ? `<div class="text-sm text-slate-500">${s.name_fr}</div>` : ''}
                    </td>
                    <td class="px-5 py-4 align-top text-slate-700">${s.category}</td>
                    <td class="px-5 py-4 align-top text-lg">${s.icon || '-'}</td>
                    <td class="px-5 py-4 align-top">
                        ${s.color ? `<div class="h-8 w-8 rounded-2xl border border-slate-200" style="background-color: ${s.color};"></div>` : '<span class="text-sm text-slate-500">-</span>'}
                    </td>
                    <td class="px-5 py-4 align-top">
                        <div class="flex flex-wrap gap-2">
                            <button class="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-200" onclick="editSpecialty(${s.id})">Edit</button>
                            <button class="inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-rose-700" onclick="deleteSpecialty(${s.id})">Delete</button>
                        </div>
                    </td>
                </tr>
            `).join('');

            table.classList.remove('hidden');
        }

        function filterSpecialties() {
            const searchTerm = document.getElementById('searchInput').value.toLowerCase();
            const category = document.getElementById('categoryFilter').value;

            const filtered = allSpecialties.filter(s => {
                const matchesSearch = s.name_en.toLowerCase().includes(searchTerm) ||
                                    (s.name_fr && s.name_fr.toLowerCase().includes(searchTerm)) ||
                                    (s.description && s.description.toLowerCase().includes(searchTerm));
                const matchesCategory = !category || s.category === category;
                return matchesSearch && matchesCategory;
            });

            displaySpecialties(filtered);
        }

        function updateStats() {
            document.getElementById('totalSpecialties').textContent = allSpecialties.length;
            const categories = new Set(allSpecialties.map(s => s.category));
            document.getElementById('totalCategories').textContent = categories.size;
        }

        async function populateCategoryFilter() {
            try {
                const response = await fetch('/api/specialties/categories/all');
                const result = await response.json();

                if (result.success) {
                    const select = document.getElementById('categoryFilter');
                    const options = result.data.map(c => `<option value="${c}">${c}</option>`).join('');
                    select.innerHTML = '<option value="">All Categories</option>' + options;
                }
            } catch (error) {
                console.error('Error loading categories:', error);
            }
        }

        function openAddSpecialtyModal() {
            currentEditId = null;
            document.getElementById('specialtyForm').reset();
            document.getElementById('modalTitle').textContent = 'Add Specialty';
            document.getElementById('specialtyId').value = '';
            document.getElementById('color').value = '#27ae60';
            document.getElementById('specialtyModal').classList.remove('hidden');
        }

        function closeSpecialtyModal() {
            document.getElementById('specialtyModal').classList.add('hidden');
            currentEditId = null;
        }

        async function editSpecialty(id) {
            try {
                const response = await fetch(`/api/specialties/${id}`);
                const result = await response.json();

                if (result.success) {
                    const s = result.data;
                    document.getElementById('specialtyId').value = s.id;
                    document.getElementById('nameEn').value = s.name_en;
                    document.getElementById('nameFr').value = s.name_fr || '';
                    document.getElementById('namePt').value = s.name_pt || '';
                    document.getElementById('category').value = s.category;
                    document.getElementById('description').value = s.description || '';
                    document.getElementById('image').value = s.image || '';
                    document.getElementById('icon').value = s.icon || '';
                    document.getElementById('color').value = s.color || '#27ae60';
                    document.getElementById('activeStatus').value = s.active ? '1' : '0';

                    document.getElementById('modalTitle').textContent = 'Edit Specialty';
                    currentEditId = id;
                    document.getElementById('specialtyModal').classList.remove('hidden');
                }
            } catch (error) {
                console.error('Edit error:', error);
                showAlert('Error loading specialty: ' + error.message, 'error');
            }
        }

        async function saveSpecialty(event) {
            event.preventDefault();

            const id = document.getElementById('specialtyId').value;
            const specialtyData = {
                name_en: document.getElementById('nameEn').value,
                name_fr: document.getElementById('nameFr').value,
                name_pt: document.getElementById('namePt').value,
                category: document.getElementById('category').value,
                description: document.getElementById('description').value,
                image: document.getElementById('image').value,
                icon: document.getElementById('icon').value,
                color: document.getElementById('color').value,
                active: document.getElementById('activeStatus').value === '1'
            };

            try {
                const url = id ? `/api/specialties/${id}` : '/api/specialties';
                const method = id ? 'PUT' : 'POST';

                const response = await fetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(specialtyData)
                });

                const result = await response.json();

                if (result.success) {
                    showAlert(result.message, 'success');
                    closeSpecialtyModal();
                    await loadSpecialties();
                } else {
                    showAlert('Failed to save specialty: ' + result.message, 'error');
                }
            } catch (error) {
                console.error('Save error:', error);
                showAlert('Error saving specialty: ' + error.message, 'error');
            }
        }

        async function deleteSpecialty(id) {
            if (!confirm('Are you sure you want to delete this specialty?')) return;

            try {
                const response = await fetch(`/api/specialties/${id}`, { method: 'DELETE' });
                const result = await response.json();

                if (result.success) {
                    showAlert(result.message, 'success');
                    await loadSpecialties();
                } else {
                    showAlert('Failed to delete specialty: ' + result.message, 'error');
                }
            } catch (error) {
                console.error('Delete error:', error);
                showAlert('Error deleting specialty: ' + error.message, 'error');
            }
        }

        function showAlert(message, type) {
            const alertBox = document.getElementById('alertBox');
            alertBox.textContent = message;
            alertBox.className = `rounded-[32px] border px-5 py-4 text-sm ${type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`;
            setTimeout(() => {
                alertBox.className = 'hidden';
            }, 5000);
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeSpecialtyModal();
        });

        document.addEventListener('DOMContentLoaded', () => {
            loadSpecialties();
            setTimeout(() => {
                const navLinks = document.querySelectorAll('.nav-link');
                navLinks.forEach(link => {
                    link.style.color = 'rgba(255, 255, 255, 0.7)';
                    link.style.textDecoration = 'none';
                    link.style.backgroundColor = 'transparent';
                    if (link.classList.contains('active')) {
                        link.style.backgroundColor = 'rgba(196, 30, 30, 0.2)';
                        link.style.color = 'rgba(255, 255, 255, 1)';
                        link.style.borderLeftColor = '#c41e1e';
                        link.style.fontWeight = '700';
                        link.style.paddingLeft = '16px';
                    }
                    link.addEventListener('mouseenter', function() {
                        this.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                        this.style.color = 'rgba(255, 255, 255, 0.95)';
                        if (!this.classList.contains('active')) this.style.paddingLeft = '16px';
                    });
                    link.addEventListener('mouseleave', function() {
                        if (this.classList.contains('active')) {
                            this.style.backgroundColor = 'rgba(196, 30, 30, 0.2)';
                            this.style.color = 'rgba(255, 255, 255, 1)';
                        } else {
                            this.style.backgroundColor = 'transparent';
                            this.style.color = 'rgba(255, 255, 255, 0.7)';
                            this.style.paddingLeft = '14px';
                        }
                    });
                });
            }, 100);
        });
    </script>

    <script src="/admin/admin.js"></script>
</body>
</html>'''
Path('backend/admin/specialties.html').write_text(content, encoding='utf-8')
print('specialties.html rewritten')
