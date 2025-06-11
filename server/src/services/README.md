# PDF Extraction Services

This directory contains the services responsible for downloading, extracting, processing, and scheduling the PDF extraction process for the CJF Judicial News Portal.

## Directory Structure

- `pdf/`: Services for downloading and extracting content from PDFs
- `content/`: Services for processing and categorizing the extracted content
- `scheduler/`: Services for scheduling the extraction process

## PDF Extraction Process

The PDF extraction process consists of the following steps:

1. **Download**: The PDF is downloaded from the CJF website (https://www.cjf.gob.mx/SinInformativa/resumenInformativo.pdf)
2. **Extract**: The text and images are extracted from the PDF
3. **Process**: The extracted content is processed and categorized into the appropriate sections
4. **Store**: The processed content is stored in the database

## Services

### PDF Extractor Service (`pdf/pdfExtractor.js`)

This service is responsible for downloading and extracting content from the daily PDF report. It provides the following functionality:

- `downloadPDF()`: Downloads the PDF from the specified URL
- `extractContent()`: Extracts text and images from the PDF
- `extractTextContent()`: Extracts text content from the PDF
- `extractImages()`: Extracts images from the PDF
- `getPDFPath()`: Gets the path to the PDF file for a specific date
- `pdfExists()`: Checks if a PDF exists for a specific date
- `getLatestPDF()`: Gets the latest PDF file

### Content Processor Service (`content/contentProcessor.js`)

This service is responsible for processing and categorizing the extracted content from the PDF and preparing it for storage in the database. It provides the following functionality:

- `processContent()`: Processes extracted content and stores it in the database
- `processArticleSection()`: Processes a section containing articles
- `processImageSection()`: Processes a section containing images
- `optimizeImage()`: Optimizes an image for web display

### Scheduler Service (`scheduler/scheduler.js`)

This service is responsible for scheduling the PDF extraction process to run automatically at specified intervals. It provides the following functionality:

- `scheduleJob()`: Schedules a job to run at a specific time
- `cancelJob()`: Cancels a scheduled job
- `getActiveJobs()`: Gets all active jobs
- `pdfExtractionJob()`: PDF extraction job function
- `initializeScheduler()`: Initializes the scheduler
- `runExtractionJob()`: Runs the PDF extraction job manually

## API Endpoints

The API endpoints for the PDF extraction functionality are defined in `server/src/api/extraction.js`. The following endpoints are available:

- `GET /api/extraction/status`: Get the status of the extraction process
- `GET /api/extraction/logs`: Get extraction logs (admin only)
- `POST /api/extraction/run`: Trigger a manual extraction (admin only)
- `GET /api/extraction/dates`: Get available extraction dates
- `GET /api/extraction/date/:date`: Check if extraction exists for a specific date

## Usage

### Scheduled Extraction

The PDF extraction process is scheduled to run daily at the time specified in the `extraction_time` setting (default: 08:00). This is configured in the `initializeScheduler()` function in the scheduler service.

### Manual Extraction

You can trigger a manual extraction by making a POST request to the `/api/extraction/run` endpoint (admin only) or by running the following command:

```bash
npm run extract:pdf:new
```

### Viewing Extraction Status

You can view the status of the extraction process by making a GET request to the `/api/extraction/status` endpoint.

### Viewing Extraction Logs

You can view the extraction logs by making a GET request to the `/api/extraction/logs` endpoint (admin only).

## Configuration

The PDF extraction functionality can be configured using the following environment variables:

- `PDF_URL`: URL of the daily PDF report (default: https://www.cjf.gob.mx/SinInformativa/resumenInformativo.pdf)
- `LOG_LEVEL`: Log level (default: info)

You can also configure the extraction time using the `extraction_time` setting in the database.