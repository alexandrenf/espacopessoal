# Migration Test Plan: Document to Notebook Routing

## Overview
This document outlines the testing strategy for validating the migration from `/documents/[documentId]` to `/notas/[url]/[documentId]` routing structure.

## Pre-Migration Testing

### 1. Backup and Validation
- [ ] **Database Backup**: Create backup of current database state
- [ ] **Run Migration Validation**: Execute `validateMigration` query to check current state
- [ ] **Document Legacy URLs**: Record existing document URLs for redirect testing

### 2. Migration Dry Run
- [ ] **Execute Dry Run**: Run `runFullMigration({ dryRun: true })` 
- [ ] **Validate Results**: Check migration report for expected users and documents
- [ ] **Identify Edge Cases**: Look for users with existing notebooks, orphaned documents

## Migration Execution

### 3. Run Migration
- [ ] **Execute Migration**: Run `runFullMigration({ dryRun: false })`
- [ ] **Monitor Logs**: Watch for errors, completion messages
- [ ] **Validate Results**: Run `validateMigration` to ensure all documents have notebooks

### 4. Migration Rollback Test (if needed)
- [ ] **Rollback Dry Run**: Test `rollbackMigration({ dryRun: true })`
- [ ] **Rollback Execution**: Execute `rollbackMigration({ dryRun: false })` if issues found

## Post-Migration Testing

### 5. New Notebook System
- [ ] **Notebook Creation**: Create new notebook with custom URL
- [ ] **Document Creation**: Create document within notebook
- [ ] **Document Navigation**: Navigate between documents in same notebook
- [ ] **Sidebar Functionality**: Test document sidebar shows only notebook documents

### 6. URL Redirects
- [ ] **Legacy URL Access**: Visit old `/documents/[documentId]` URLs
- [ ] **Redirect Verification**: Confirm redirects to `/notas/[url]/[documentId]`
- [ ] **Document Loading**: Verify document loads correctly after redirect

### 7. Document Management
- [ ] **Document CRUD**: Test create, read, update, delete operations
- [ ] **Folder Operations**: Test folder creation and document organization
- [ ] **Drag and Drop**: Test document reordering within notebook

### 8. Authentication & Authorization
- [ ] **Private Notebooks**: Test password-protected notebooks
- [ ] **Public Notebooks**: Test public notebook access
- [ ] **Owner Permissions**: Verify only owners can edit notebooks/documents

### 9. Search and Navigation
- [ ] **Document Search**: Test search functionality within notebooks
- [ ] **Breadcrumb Navigation**: Test navigation between notebook and documents
- [ ] **Home Navigation**: Test navigation to home page

### 10. Error Handling
- [ ] **Invalid URLs**: Test invalid notebook URLs and document IDs
- [ ] **Deleted Documents**: Test accessing deleted documents
- [ ] **Permission Errors**: Test unauthorized access attempts

## Test Scenarios

### Scenario 1: New User Journey
1. User signs up for first time
2. Gets default "main" notebook
3. Creates first document
4. Document appears in notebook overview
5. Can navigate between notebook and document

### Scenario 2: Legacy User Migration
1. User with existing documents (pre-migration)
2. Migration creates default notebook
3. All documents moved to default notebook
4. Old URLs redirect to new format
5. User can access all documents

### Scenario 3: Multiple Notebooks
1. User creates multiple notebooks
2. Documents created in different notebooks
3. Sidebar shows only current notebook documents
4. Can switch between notebooks
5. Document URLs include notebook context

### Scenario 4: Collaborative Features
1. Document sharing within notebook context
2. Real-time collaboration works with new URLs
3. Shared links work correctly
4. Permissions respected across notebooks

## Performance Testing

### 11. Load Testing
- [ ] **Document Loading**: Test document loading performance
- [ ] **Sidebar Performance**: Test sidebar with many documents
- [ ] **Navigation Speed**: Test navigation between documents

### 12. Database Performance
- [ ] **Query Performance**: Test notebook-scoped queries
- [ ] **Migration Performance**: Measure migration execution time
- [ ] **Index Usage**: Verify proper index usage for new queries

## Browser Compatibility

### 13. Cross-Browser Testing
- [ ] **Chrome**: Test all functionality
- [ ] **Firefox**: Test all functionality
- [ ] **Safari**: Test all functionality
- [ ] **Edge**: Test all functionality

### 14. Mobile Testing
- [ ] **Mobile Sidebar**: Test mobile sidebar functionality
- [ ] **Touch Navigation**: Test touch-based navigation
- [ ] **Responsive Design**: Test responsive layout

## Data Integrity

### 15. Data Validation
- [ ] **Document Content**: Verify document content preserved
- [ ] **Folder Structure**: Verify folder hierarchy maintained
- [ ] **User Ownership**: Verify user ownership preserved
- [ ] **Timestamps**: Verify creation/update timestamps

### 16. Edge Cases
- [ ] **Documents without Notebooks**: Check for orphaned documents
- [ ] **Notebooks without Documents**: Check for empty notebooks
- [ ] **Circular References**: Check for circular folder references
- [ ] **Duplicate URLs**: Check for duplicate notebook URLs

## Success Criteria

### Migration Success
- ✅ All documents have notebook associations
- ✅ All users have at least one notebook
- ✅ No data loss during migration
- ✅ Old URLs redirect correctly
- ✅ New URLs work as expected

### Functionality Success
- ✅ Document creation/editing works
- ✅ Notebook management works
- ✅ Authentication/authorization works
- ✅ Search and navigation work
- ✅ Real-time collaboration works

### Performance Success
- ✅ Page load times < 2 seconds
- ✅ Migration completes within reasonable time
- ✅ Database queries perform well
- ✅ UI is responsive

## Rollback Plan

### If Migration Fails
1. **Stop Migration**: Cancel ongoing migration
2. **Restore Backup**: Restore database from backup
3. **Investigate Issues**: Analyze migration logs
4. **Fix Issues**: Address identified problems
5. **Retry Migration**: Execute migration again

### If Post-Migration Issues
1. **Assess Impact**: Determine severity of issues
2. **Quick Fixes**: Apply hotfixes if possible
3. **Rollback Migration**: Use `rollbackMigration` if necessary
4. **Communication**: Notify users of issues/fixes

## Test Data

### Sample Test Cases
- User with 0 documents
- User with 1 document
- User with 10+ documents
- User with folders and sub-documents
- User with shared documents
- User with very long document titles
- User with special characters in document titles

### Test Notebooks
- Public notebook with simple URL
- Private notebook with password
- Notebook with special characters in URL
- Notebook with long description
- Notebook with many documents

## Execution Checklist

### Pre-Migration
- [ ] All tests pass in current system
- [ ] Database backup created
- [ ] Migration scripts validated
- [ ] Test environment ready

### Migration
- [ ] Dry run executed successfully
- [ ] Migration executed successfully
- [ ] Validation confirms success
- [ ] Rollback tested (if needed)

### Post-Migration
- [ ] All test scenarios pass
- [ ] Performance tests pass
- [ ] Browser compatibility verified
- [ ] Mobile functionality verified
- [ ] Data integrity confirmed

### Deployment
- [ ] Production migration planned
- [ ] Monitoring setup
- [ ] User communication prepared
- [ ] Support team briefed

## Notes

- **Test Environment**: Ensure testing is done in environment similar to production
- **User Communication**: Prepare users for URL changes and new features
- **Documentation**: Update user documentation with new URL structure
- **Monitoring**: Set up monitoring for migration and post-migration issues
- **Support**: Prepare support team for migration-related questions 