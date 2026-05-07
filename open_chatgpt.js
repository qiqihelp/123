const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true
  });
  const page = await browser.newPage();
  
  try {
    await page.goto('https://chat.openai.com', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    console.log('Page loaded successfully!');
    console.log('URL:', page.url());
    console.log('Title:', await page.title());
    
    // Take a screenshot
    await page.screenshot({ path: 'chatgpt_screenshot.png', fullPage: true });
    console.log('Screenshot saved to chatgpt_screenshot.png');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
