const puppeteer = require('puppeteer');
const path = require('path');
const { JSDOM } = require("jsdom");
const fs = require('fs-extra');
const moment = require('moment');
const { window } = new JSDOM("");
const { document } = (new JSDOM("")).window;

global.document = document;
const DOMParser = window.DOMParser;

async function fetchPageDetails(url) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle0' });

    const details = await page.evaluate(() => {
        const getTextContent = (selector, split = false) => {
            const element = document.querySelector(selector);
            if (!element) return '';
            const text = element.textContent.trim();
            return split ? text.split(':')[1]?.trim() || text : text;
        };

        const getHref = (selector) => {
            const element = document.querySelector(selector);
            return element ? element.href : '';
        };

        const release = {
            name: getTextContent('h2'),
            date: getTextContent('#release li:nth-child(2)', true),
            author: getTextContent('#release li:nth-child(3) a'),
            series: getTextContent('#release li:nth-child(4) a')
        };

        const download = {
            filename: getTextContent('#download li:first-child b'),
            size: getTextContent('#download li:first-child small').replace(/[()]/g, ''),
            mirror_link: getHref('#download li:nth-child(2) a')
        };

        const description = {
            difficulty: getTextContent('#description p:first-child', true),
            secret: getTextContent('#description p:nth-child(2)'),
            contact: getTextContent('#description p:nth-child(2) a'),
            note: getTextContent('#description div.pt-2')
        };

        const fileInformation = {
            filename: getTextContent('#fileinfo li:nth-child(1)', true),
            size: getTextContent('#fileinfo li:nth-child(2)', true),
            md5: getTextContent('#fileinfo li:nth-child(3)', true),
            sha1: getTextContent('#fileinfo li:nth-child(4)', true)
        };

        const virtualMachine = {
            format: getTextContent('#vm li:nth-child(1)', true),
            operating_system: getTextContent('#vm li:nth-child(2)', true)
        };

        const networking = {
            dhcp_service: getTextContent('#networking li:nth-child(1)', true),
            ip_address: getTextContent('#networking li:nth-child(2)', true)
        };

        const screenshotThumbnails = document.querySelectorAll('#screenshot .thumbnail');
        const screenshots = {
            available: screenshotThumbnails.length > 0,
            count: screenshotThumbnails.length,
            links: Array.from(screenshotThumbnails).map(thumbnail => thumbnail.querySelector('a')?.href || ''),
            images: []
        };

        return {
            release,
            download,
            description,
            file_information: fileInformation,
            virtual_machine: virtualMachine,
            networking,
            screenshots
        };
    });

    // Fetch and encode screenshots
    for (const src of details.screenshots.links) {
        const imageBuffer = await page.evaluate(async (imageSrc) => {
            const response = await fetch(imageSrc);
            const blob = await response.blob();
            return await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
            });
        }, src);
        
        details.screenshots.images.push(imageBuffer);
    }

    await browser.close();

    return details;
}

async function main() {

    // Fetch the latest sitemap.xml
    const sitemapUrl = 'https://www.vulnhub.com/sitemap.xml';
    const sitemapResponse = await fetch(sitemapUrl);
    const sitemapText = await sitemapResponse.text();

    // Parse the sitemap.xml and extract URLs
    const parser = new DOMParser();
    const sitemapXml = parser.parseFromString(sitemapText, 'text/xml');
    const allUrls = Array.from(sitemapXml.getElementsByTagName('loc')).map((element) => element.textContent);

    // Filter URLs starting with https://www.vulnhub.com/entry/ and https://www.vulnhub.com/series/
    const entries = allUrls.filter((url) => url.startsWith('https://www.vulnhub.com/entry/'));
    // const series = allUrls.filter((url) => url.startsWith('https://www.vulnhub.com/series/'));

    // Store the extracted URLs in an object
    const extractedUrls = {
        entries,
        // series
    };

    console.log(`\nSuccessfully parsed sitemap.xml and extracted ${entries.length} entries.\n`);

    const visitedItemBasePath = path.join(__dirname, "./output/items");
    try {
        fs.ensureDirSync(visitedItemBasePath);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
    
    // Load or initialize the visited URLs JSON file
    const visitedFilePath = path.join(__dirname, 'db_visited.json');
    let visitedUrls = [];
    try {
        visitedUrls = JSON.parse(fs.readFileSync(visitedFilePath, 'utf8'));
    } catch (error) {
        console.log('No existing db_visited.json file found. Creating a new one.');
    }

    const allDetails = [];
    for (const category in extractedUrls) {
        let count = 1;
        for (const url of extractedUrls[category]) {
            if (!visitedUrls.includes(url)) {
                console.log(`\nFetching details of item number ${count} out of ${extractedUrls[category].length}.`);
                const details = await fetchPageDetails(url);
                allDetails.push(details);
                visitedUrls.push(url);
                fs.writeFileSync(visitedFilePath, JSON.stringify(visitedUrls, null, 2));
                const sanitizedReleaseName = details.release.name.replace(/[^\w\s]/g, '').replace(/\s/g, '_').toLowerCase();
                fs.writeFileSync(path.join(visitedItemBasePath, `${sanitizedReleaseName}-${moment().format('YYYY-MM-DD_HH-mm-ss')}.json`), JSON.stringify(details, null, 2));
                console.log(`Successfully fetched details of item number ${count} out of ${extractedUrls[category].length}.`);
                console.log(`Details :`, Object.keys(details).reduce((acc, key) => {
                    acc[key] = {
                        length: Object.keys(details[key]).length
                    };
                    return acc;
                }, {}));
            } else {
                console.log(`Skipping already visited URL: ${url}`);
            }
            count++;
        }
    }
    console.log('Successfully fetched all details.');

    const outputDir = 'output';
    const filename = `vulnhub-vm-list-${moment().format('YYYY-MM-DD_HH-mm-ss')}.json`;
    const outputPath = path.join(outputDir, filename);

    const allDetailsString = JSON.stringify(allDetails, null, 2);

    fs.ensureDirSync(outputDir);
    fs.writeFileSync(outputPath, allDetailsString);

    console.log(`Stored all details in ${outputPath}`);

}

main().catch((err)=>{
    console.error(err);
    process.exit(1);
});

