# Section Insertion Debug Guide

## Problem Fixed
The issue where content was being inserted into the wrong section (e.g., selecting "Problem" but content going to "Tech Stack") has been addressed with improved section detection logic.

## Key Changes Made

### 1. Enhanced Section Detection Logic
- **Before**: Used simple `includes()` matching which could match partial text
- **After**: Uses multiple matching strategies with priority:
  1. Exact match (highest priority)
  2. Starts-with match for level 2 headings
  3. Word boundary match for better precision

### 2. Improved Position Finding
- Added comprehensive logging for debugging
- Better handling of section ordering based on DOCUMENT_SECTIONS array
- More robust next-section detection

### 3. Added Debugging Tools
- Console logging in development mode
- `window.debugDocumentSections()` function for real-time debugging
- Comprehensive test suite for section detection logic

## How to Test the Fix

### 1. **Basic Testing**
1. Open the idea workspace with a document that has sections
2. Send a message to the AI assistant
3. Click "Insert to Document" → "Problem"
4. Verify content appears in the Problem section, not elsewhere

### 2. **Debug in Browser Console**
Open browser console and run:
```javascript
// See all document structure
window.debugDocumentSections()

// Test specific section insertion
window.insertIntoDocumentSection('problem', 'Test content for problem section')
```

### 3. **Check Console Logs**
In development mode, you'll see detailed logs like:
```
Looking for "Problem", found at position: 45
All headings found: [{pos: 12, text: "Idea Documentation", level: 1}, {pos: 45, text: "Problem", level: 2}, ...]
Inserting content at position 156
```

## Common Issues and Solutions

### Issue: Content still goes to wrong section
**Debug Steps:**
1. Run `window.debugDocumentSections()` in console
2. Check if the target section exists in the document
3. Verify the heading text matches exactly with DOCUMENT_SECTIONS

### Issue: Section not found
**Possible Causes:**
- Heading text doesn't match exactly (e.g., "Problems" vs "Problem")
- Heading level is not 2 (h2)
- Document structure is malformed

**Solution:**
- Ensure document follows the standard template structure
- Check heading levels and text formatting

### Issue: Content appears at wrong position within section
**Debug Steps:**
1. Check console logs for "Found next section at position X"
2. Verify the next section detection is working correctly
3. Look for any malformed HTML that might affect positioning

## Section Matching Logic

The new logic uses this priority order:

```typescript
// 1. Exact match (highest priority)
const isExactMatch = headingText.toLowerCase() === targetTitle.toLowerCase();

// 2. Starts with match (for level 2 headings only)
const isStartsWithMatch = headingText.toLowerCase().startsWith(targetTitle.toLowerCase()) && level <= 2;

// 3. Word boundary match (for partial matches)
const isWordMatch = new RegExp(`\\b${targetTitle.toLowerCase()}\\b`).test(headingText.toLowerCase()) && level <= 2;
```

## Expected Document Structure

The system expects this structure:
```markdown
# Idea Documentation

## Problem
[Content here]

## Target Users
[Content here]

## Solution
[Content here]

## Key Features
[Content here]

## Research & Validation
[Content here]

## MVP Plan
[Content here]

## Tech Stack
[Content here]

## Specification
[Content here]
```

## Testing Commands

Run the test suite:
```bash
npm run test -- --run src/test/unit/section-detection.test.tsx
npm run test -- --run src/test/unit/document-insertion.test.tsx
```

## Files Modified

1. **src/components/editor/document-editor.tsx**
   - Enhanced `findSectionPosition()` function
   - Improved `insertIntoSection()` logic
   - Added debugging capabilities

2. **src/test/unit/section-detection.test.tsx**
   - Comprehensive tests for section matching logic

3. **SECTION_INSERTION_DEBUG.md**
   - This debugging guide

## Next Steps

1. **Test the fix** with the actual problem case
2. **Use debugging tools** if issues persist
3. **Check console logs** for detailed insertion flow
4. **Report specific cases** where insertion still fails

The insertion should now work correctly, placing content in the intended section rather than defaulting to Tech Stack or other wrong sections.