

# Permission Saving Debugging Guide

## Summary
The backend API for saving permissions is **working perfectly**. Permissions ARE being saved to the database correctly.

The issue is likely on the frontend (browser) side.

## What I've Verified ✅

1. **Backend API** - ✅ WORKS
   - POST /api/roles (create with permissions)
   - PUT /api/roles/{id} (update with permissions)  
   - Permissions are correctly stored as JSON in database
   - Admin user has `manage_roles` permission
   - Full workflow tested: login → fetch → edit → save → verify

2. **Database** - ✅ WORKS
   - All permissions are stored correctly
   - Can be retrieved without issues
   - Admin role has all permissions including manage_roles

3. **Authorization** - ✅ WORKS
   - Admin user has Admin role
   - Admin role has manage_roles permission

## What To Check On Frontend

### Step 1: Open Browser Console
1. Go to admin dashboard: http://localhost:3000
2. Open browser console (F12 → Console tab)
3. Look for any red error messages
4. Clear console
5. Login if needed

### Step 2: Try to Edit a Role
1. Click "Roles" in sidebar
2. Wait for roles to load
3. Click "Edit" button on any role
4. In browser console, you should see:
   ```
   [RoleController.list] Fetching all roles
   [Roles] Loading roles...
   [Roles] Loaded roles: [...]
   ```

### Step 3: Check Permission Checkboxes
1. Modal should open with permission checkboxes
2. Some checkboxes should be pre-checked (checked=true)
3. In console, you should see:
   ```
   [openRoleModal] Found role: { ... }
   [openRoleModal] Permissions: { ... }
   ```

### Step 4: Try to Save
1. Check/uncheck some permission boxes
2. Click "Save" button  
3. In console, look for:
   ```
   [saveRole] Found X permission checkboxes
   [saveRole] Permission: view_products = true
   [saveRole] Role data to save: { ... }
   [saveRole] PUT /api/roles/3
   [saveRole] Response status: 200
   [saveRole] ✅ Success! Saved role: { ... }
   ```

## Common Issues & Solutions

### Issue: No console output when clicking Edit
**Solution**: The image/modal might not be opening. Check:
- Are you clicking the "Edit" button?
- Is the modal appearing on screen?

### Issue: Role not found in modal
**Solution**: The roles array might not be loaded. Check:
- Is "Loading roles..." visible when page loads?
- Wait for table to populate with data

### Issue: Checkboxes not pre-checked when editing
**Solution**: The permissions might not be an object. Verify in console:
- Type: `roles[0].permissions` to check format
- Should be an object like `{ view_products: true, ... }`

### Issue: Save fails with 401 error
**Solution**: Authentication token expired
- Logout and login again
- Token should be in localStorage

### Issue: Save succeeds but permissions don't change
**Solution**: 
- Check database directly with: `node test-permissions.js`
- Or try the full test: `node test-full-permission-flow.js`

## Test Scripts Available

Run these from the terminal to verify everything works:

```bash
# Check what permissions are in database
node test-permissions.js

# Test the full save workflow
node test-full-permission-flow.js

# Check admin user permissions  
node test-admin-permissions.js

# Test API responses
node test-api-response.js
```

##  How To Report Issues

When reporting a permissions issue, please provide:

1. **Browser console screenshot** (F12 → Console)
   - Paste any error messages
   - Paste the `[saveRole]` logged data

2. **Steps to reproduce**:
   - Exactly what you clicked
   - Which role you were editing
   - Which permissions you changed

3. **Expected vs Actual**:
   - What did you expect to happen?
   - What actually happened?

## Technical Details for Developers

### Frontend Flow (roles.html)
1. Page load → `loadRoles()` → GET /api/roles
2. User clicks Edit → `editRole(id)` → `openRoleModal(id)`
3. Modal opens → permissions pre-checked based on role.permissions object
4. User checks/unchecks boxes
5. User clicks Save → `saveRole()` event handler (form submit)
6. `saveRole()` collects all checkbox values into permissions object
7. Sends PUT /api/roles/{id} with permissions in body
8. On success → shows alert → closes modal → reloads roles

### Backend Flow
1. PUT /api/roles/{id} → RoleController.update()
2. Validates permission via `checkPermission('manage_roles')` middleware
3. Calls Role.update(id, { permissions })
4. Role model: `JSON.stringify(permissions)` for storage
5. Returns updated role with normalizedPermissions (parsed back to object)

### Database Storage
- Table: `roles`
- Column: `permissions` (JSON type)
- Example: `{"view_products": true, "manage_products": false, ...}`

---

**Last Updated**: When debugging was completed
**Status**: Backend working ✅ | Database working ✅ | Frontend needs testing


