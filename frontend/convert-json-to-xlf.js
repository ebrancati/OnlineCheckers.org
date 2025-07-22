#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Script to convert JSON translations to XLF format
 * Usage: node convert-json-to-xlf.js
 */

// File paths
const JSON_FILE = './src/assets/i18n/it.json';
const XLF_SOURCE = './src/locale/messages.xlf';
const XLF_TARGET = './src/locale/messages.it.xlf';

// Flatten nested JSON object
function flattenObject(obj, prefix = '') {
  const flattened = {};
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        Object.assign(flattened, flattenObject(obj[key], newKey));
      } else {
        flattened[newKey] = obj[key];
      }
    }
  }
  
  return flattened;
}

// Escape special XML characters
function escapeXml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}


function convertJsonToXlf() {
  try {
    console.log('Converting JSON translations to XLF format...');
    
    // Read JSON file
    if (!fs.existsSync(JSON_FILE)) {
      console.error(`JSON file not found: ${JSON_FILE}`);
      process.exit(1);
    }
    
    const jsonContent = fs.readFileSync(JSON_FILE, 'utf8');
    const translations = JSON.parse(jsonContent);
    const flatTranslations = flattenObject(translations);
    
    console.log(`Found ${Object.keys(flatTranslations).length} translations in JSON`);
    
    // Read source XLF file
    if (!fs.existsSync(XLF_SOURCE)) {
      console.error(`Source XLF file not found: ${XLF_SOURCE}`);
      console.log('Run "ng extract-i18n --output-path src/locale" first');
      process.exit(1);
    }
    
    let xlfContent = fs.readFileSync(XLF_SOURCE, 'utf8');
    
    // Change source-language to target language
    xlfContent = xlfContent.replace('source-language="en"', 'target-language="it" source-language="en"');
    
    // Count matches
    let matchedCount = 0;
    let totalTransUnits = 0;
    
    // Replace source texts with target translations
    xlfContent = xlfContent.replace(/<trans-unit[^>]*id="([^"]*)"[^>]*>([\s\S]*?)<\/trans-unit>/g, (match, id, content) => {
      totalTransUnits++;
      
      // Extract the source content
      const sourceMatch = content.match(/<source>([\s\S]*?)<\/source>/);
      if (!sourceMatch) return match;
      
      const sourceText = sourceMatch[1];
      
      // Look for translation in our JSON
      let translation = flatTranslations[id];
      
      if (translation) {
        matchedCount++;
    
        const escapedTranslation = escapeXml(translation);
        
        // Add target element after source
        const updatedContent = content.replace(
          /(<\/source>)/,
          `$1\n        <target>${escapedTranslation}</target>`
        );
        
        return match.replace(content, updatedContent);
      } else {
        console.log(`No translation found for ID: ${id}`);
        
        // Add empty target element
        const updatedContent = content.replace(
          /(<\/source>)/,
          `$1\n        <target></target>`
        );
        
        return match.replace(content, updatedContent);
      }
    });
    
    // Write the result
    fs.writeFileSync(XLF_TARGET, xlfContent, 'utf8');
    
    console.log(`Conversion completed!`);
    console.log(`Statistics:`);
    console.log(`   - Total trans-units in XLF: ${totalTransUnits}`);
    console.log(`   - Matched translations: ${matchedCount}`);
    console.log(`   - Missing translations: ${totalTransUnits - matchedCount}`);
    console.log(`Output file: ${XLF_TARGET}`);
    
    // Check for unused translations
    const usedKeys = new Set();
    xlfContent.replace(/id="([^"]*)"/g, (match, id) => {
      usedKeys.add(id);
      return match;
    });
    
    const unusedTranslations = Object.keys(flatTranslations).filter(key => !usedKeys.has(key));
    if (unusedTranslations.length > 0) {
      console.log(`Unused translations in JSON (${unusedTranslations.length}):`);
      unusedTranslations.forEach(key => console.log(`   - ${key}`));
    }
    
  } catch (error) {
    console.error('Error during conversion:', error.message);
    process.exit(1);
  }
}

// Run the conversion
if (require.main === module) {
  convertJsonToXlf();
}

module.exports = { convertJsonToXlf, flattenObject, escapeXml };