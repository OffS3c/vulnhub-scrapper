# VulnHub Scrapper

This project is designed to scrape and process information from VulnHub, a platform offering materials for security education and training purposes. It fetches details about various virtual machines (VMs) available for download, including their release information, download links, and descriptions. The script parses the sitemap of VulnHub to extract URLs of interest, fetches details for each entry, and saves the information in a structured JSON format.

## Directory Structure

- `/.gitignore` - Specifies intentionally untracked files to ignore.
- `/db_visited.json` - Stores URLs that have already been visited to avoid re-fetching.
- `/index.js` - The main script that orchestrates the scraping process.
- `/output/` - Contains all the output from the script.
  - `/items/` - Each file here represents detailed information about a specific VM, named according to the VM's sanitized name and the timestamp of fetching.
  - `/vulnhub-vm-list-YYYY-MM-DD_HH-mm-ss.json` - A consolidated list of all VMs fetched during a single run, with a timestamp.
- `/package.json` - Manages the project's dependencies, scripts, and versioning.
- `/README.md` - This file, providing an overview and instructions for the project.

## How to Run

Before running the script, ensure you have Node.js installed on your system. Then, follow these steps:

1. Install the project dependencies by running:

```sh
npm install
```

2. Execute scrapper:

```sh
node index.js
```

The script will begin by parsing the sitemap from VulnHub, fetching details for each VM that hasn't been visited yet, and saving the information in the /output directory.

## Project Details

- Dependencies: The project relies on several key npm packages:
  - puppeteer for headless browsing and page interaction.
  - jsdom and DOMParser for parsing and manipulating HTML/XML documents.
  - fs-extra for enhanced file system operations.
  - moment for formatting timestamps.
- Functionality: The main() function in index.js is the entry point. It orchestrates the entire process, from fetching and parsing the sitemap to saving the fetched details.
- Data Handling: The script maintains a db_visited.json file to track which VMs have already been processed, preventing redundant operations in subsequent runs.
For more detailed information about the project's implementation, refer to the index.js file.

## Disclaimer

This program is provided "as is" without warranty of any kind, either express or implied, including but not limited to the implied warranties of merchantability, fitness for a particular purpose, or non-infringement. The author and contributors to this program shall not be liable for any damages, including but not limited to direct, indirect, special, or consequential damages, arising out of or in connection with the use or performance of this program.

Please note that this program is distributed under the terms of the GNU General Public License (GPL) version 3 or any later version. You can find a copy of the license at <https://www.gnu.org/licenses/>.
