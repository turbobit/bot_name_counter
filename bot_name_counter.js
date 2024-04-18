const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const logFilePath = '/var/log/nginx/access.log';
let currentSize = 0;
let botBytesTotal = 0; // bot bytes 누적 변수

// SQLite 데이터베이스 연결
const db = new sqlite3.Database('botTraffic.sqlite', (err) => {
  if (err) {
    console.error('Error opening database:', err);
    return;
  }
  console.log('Connected to the botTraffic database.');

  // 테이블 생성
  db.run(`CREATE TABLE IF NOT EXISTS bot_counts (
    user_agent TEXT PRIMARY KEY,
    count INTEGER DEFAULT 0,
    total_bytes INTEGER DEFAULT 0
  )`, (err) => {
    if (err) {
      console.error('Error creating bot_counts table:', err);
    } else {
      console.log('bot_counts table created or exists.');
      db.run('CREATE INDEX IF NOT EXISTS idx_bot_counts_user_agent ON bot_counts (user_agent)', (err) => {
        if (err) {
          console.error('Error creating index on bot_counts table:', err);
        } else {
          console.log('Index created on bot_counts table.');
        }
      });
      db.run('CREATE INDEX IF NOT EXISTS idx_bot_counts_total_bytes ON bot_counts (total_bytes)', (err) => {
        if (err) {
          console.error('Error creating index on total_bytes table:', err);
        } else {
          console.log('Index created on bot_counts table.');
        }
      });
    }
  });

  db.run(`CREATE TABLE IF NOT EXISTS log_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT,
    ip TEXT,
    user TEXT,
    request TEXT,
    status INTEGER,
    bytes INTEGER,
    referer TEXT,
    user_agent TEXT,
    x_forwarded_for TEXT,
    host TEXT,
    server_name TEXT,
    request_time REAL,
    upstream_addr TEXT,
    upstream_status INTEGER,
    upstream_response_time REAL,
    upstream_response_length INTEGER,
    cache_status TEXT
  )`, (err) => {
    if (err) {
      console.error('Error creating log_entries table:', err);
    } else {
      console.log('log_entries table created or exists.');
      db.run('CREATE INDEX IF NOT EXISTS idx_log_entries_timestamp ON log_entries (timestamp)', (err) => {
        if (err) {
          console.error('Error creating index on log_entries table:', err);
        } else {
          console.log('Index created on log_entries table.');
        }
      });
    }
  });
});

// 파일 상태를 확인하고 초기 파일 크기 설정
fs.stat(logFilePath, (err, stats) => {
  if (err) {
    console.error('Error fetching file stats:', err);
    return;
  }
  currentSize = stats.size;
  console.log(`Start monitoring from ${currentSize} bytes.`);

  // 파일 변경을 감지하고 변화를 처리
  fs.watchFile(logFilePath, { interval: 1000 }, (curr, prev) => {
    if (curr.size > currentSize) {
      // console.log(`File change detected. Reading from byte ${currentSize} to ${curr.size}`);
      const stream = fs.createReadStream(logFilePath, { start: currentSize, end: curr.size });

      const logRegex = /(\d+\.\d+\.\d+\.\d+) - (\S+) \[(.*?)\] "(.*?)" (\d+) (\d+) "(.*?)" "(.*?)" "(.*?)" "(.*?)" sn="(.*?)" rt=(\S+) ua="(.*?)" us="(.*?)" ut="(.*?)" ul="(.*?)" cs=(\S+)/;

      stream.on('data', (data) => {
        const newData = data.toString();
        // console.log(`New data read: ${newData.substring(0, 200)}...`);
        const logs = newData.split('\n');

        logs.forEach(log => {
          const match = log.match(logRegex);
          if (match) {
            const [, ip, user, time, request, status, bytes, referer, userAgent, xForwardedFor, host, serverName, requestTime, upstreamAddr, upstreamStatus, upstreamResponseTime, upstreamResponseLength, cacheStatus] = match;

            // 봇 검출 로직
            if (userAgent.toLowerCase().includes('bot') || userAgent.toLowerCase().includes('spider')) {
              const bytes = parseInt(match[6]); // bytes 추출
              updateBotCount(db, userAgent, bytes);
              if (bytes) {
                botBytesTotal += bytes; // bot bytes 누적
              }
            }

            // 로그 항목 저장
            saveLogEntry(db, time, ip, user, request, status, bytes, referer, userAgent, xForwardedFor, host, serverName, requestTime, upstreamAddr, upstreamStatus, upstreamResponseTime, upstreamResponseLength, cacheStatus);
          }
        });

        displayCount(db); // 봇 활동 수치 출력
      });

      // stream.on('end', () => console.log('Finished reading new data.'));
      currentSize = curr.size;
    } else {
      console.log('No new data to read.');
    }
  });
});

// 봇 카운트 업데이트
function updateBotCount(db, userAgent, bytes) {
  db.get('SELECT count, total_bytes FROM bot_counts WHERE user_agent = ?', [userAgent], (err, row) => {
    if (err) {
      console.error('Error fetching bot count:', err);
      return;
    }

    const count = row ? row.count + 1 : 1;
    const totalBytes = row ? row.total_bytes + bytes : bytes;
    db.run('INSERT OR REPLACE INTO bot_counts (user_agent, count, total_bytes) VALUES (?, ?, ?)', [userAgent, count, totalBytes], (err) => {
      if (err) {
        console.error('Error updating bot count:', err);
      } else {
        // console.log(`Counting bots: ${userAgent}: ${count}`);
      }
    });
  });
}

// 로그 항목 저장
function saveLogEntry(db, timestamp, ip, user, request, status, bytes, referer, userAgent, xForwardedFor, host, serverName, requestTime, upstreamAddr, upstreamStatus, upstreamResponseTime, upstreamResponseLength, cacheStatus) {
  db.run('INSERT INTO log_entries (timestamp, ip, user, request, status, bytes, referer, user_agent, x_forwarded_for, host, server_name, request_time, upstream_addr, upstream_status, upstream_response_time, upstream_response_length, cache_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [timestamp, ip, user, request, status, bytes, referer, userAgent, xForwardedFor, host, serverName, requestTime, upstreamAddr, upstreamStatus, upstreamResponseTime, upstreamResponseLength, cacheStatus],
    (err) => {
      if (err) {
        console.error('Error saving log entry:', err);
      } else {
        // console.log('Log entry saved.');
      }
    });
}

const colors = require('colors/safe');

// 봇 활동 수치 출력
function displayCount(db) {
  db.all('SELECT user_agent, count, total_bytes FROM bot_counts ORDER BY total_bytes desc', (err, rows) => {
    if (err) {
      console.error('Error fetching bot counts:'.red, err);
      return;
    }
    const now = new Date().toLocaleString(); // 현재 날짜와 시간을 문자열 형식으로 변환
    console.log('--------------');
    console.log(`Bot Activity Counts (as of ${now})`); // 현재 시간 출력
    console.log(`Total Bot Traffic: ${humanReadableBytes(botBytesTotal)}`); // human readable bytes 출력

    rows.forEach((row, index) => {
      const userAgentWords = row.user_agent.split(' ');
      const coloredUserAgent = userAgentWords.map(word => {
        if (word.toLowerCase().includes('bot') || word.toLowerCase().includes('spider')) {
          return colors.red(word);
        }
        return word;
      }).join(' ');
      console.log(`${index + 1}. ${coloredUserAgent}/cnt:${numberFormat(row.count)}/${humanReadableBytes(row.total_bytes)}`);
    });

    console.log('--------------');
  });
}
function numberFormat(value) {
  return value.toLocaleString('ko-KR', { maximumFractionDigits: 0 }); 
}

// bytes 값을 human readable 형식으로 변환하는 함수
function humanReadableBytes(bytes) {
  if (bytes < 1024) {
    return bytes + 'Bytes';
  } else if (bytes < 1048576) {
    return (bytes / 1024).toFixed(1) + 'KB';
  } else if (bytes < 1073741824) {
    return (bytes / 1048576).toFixed(1) + 'MB';
  } else {
    return (bytes / 1073741824).toFixed(1) + 'GB';
  }
}