# Bot Traffic Monitoring with Node.js and SQLite

This is a Node.js application that monitors bot traffic from an Nginx access log file and stores the log entries and bot counts in an SQLite database. The application uses the `fs` module to watch for changes in the log file and processes new log entries as they are appended to the file.

## Features

- Monitors an Nginx access log file for new entries
- Detects bot traffic based on the user agent string
- Stores log entries in an SQLite database table (`log_entries`)
- Counts bot visits and bytes transferred for each bot user agent
- Stores bot counts in an SQLite database table (`bot_counts`)
- Indexes database tables for efficient queries
- Displays bot activity counts and total bot traffic in human-readable format
- Logs errors and status messages to the console

## Usage

1. Install the required dependencies by running `npm install sqlite3` (or `yarn add sqlite3`).
2. Set the path to your Nginx access log file in the `logFilePath` variable at the top of the code.
3. Run the script with `node script.js`.
4. The script will create an SQLite database file named `botTraffic.sqlite` in the current directory if it doesn't exist.
5. As new log entries are appended to the Nginx access log file, the script will process them, detect bot traffic, and store the log entries and bot counts in the SQLite database.
6. The console will display the bot activity counts and total bot traffic periodically.

## Database Tables

### `bot_counts`

This table stores the count of bot visits and total bytes transferred for each bot user agent.

- `user_agent` (TEXT): The bot user agent string (primary key)
- `count` (INTEGER): The number of visits by the bot
- `total_bytes` (INTEGER): The total bytes transferred by the bot

### `log_entries`

This table stores the individual log entries from the Nginx access log file.

- `id` (INTEGER): Auto-incrementing primary key
- `timestamp` (TEXT): The timestamp of the log entry
- `ip` (TEXT): The IP address of the client
- `user` (TEXT): The user associated with the request
- `request` (TEXT): The HTTP request made by the client
- `status` (INTEGER): The HTTP status code of the response
- `bytes` (INTEGER): The number of bytes transferred
- `referer` (TEXT): The HTTP referer header
- `user_agent` (TEXT): The user agent string of the client
- `x_forwarded_for` (TEXT): The X-Forwarded-For header
- `host` (TEXT): The host header
- `server_name` (TEXT): The server name
- `request_time` (REAL): The request time in seconds
- `upstream_addr` (TEXT): The upstream address
- `upstream_status` (INTEGER): The upstream status code
- `upstream_response_time` (REAL): The upstream response time in seconds
- `upstream_response_length` (INTEGER): The length of the upstream response
- `cache_status` (TEXT): The cache status

## License

This project is licensed under the [MIT License](LICENSE).