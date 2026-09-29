const https = require('https');
const notifier = require('node-notifier');
const child_process = require('child_process');
const fs = require('fs');
const path = require('path');
const open = require('open');

// 监控 bilibili 直播间，在开播时显示系统通知进行提醒

// 在下面的数组 [ ] 里配置要监控的直播间，每个花括号对 { }, 代表一个直播间
// 预设了 2 个直播间位置，你可以根据自己的需要进行增删
// 每个直播间只需要填写房间号 room_id
// name 可以留空，不写的话会使用主播的名字；也可以填写名字或昵称以便区分
const config = [
  {
    room_id: 15128692,
    name: ''
  },
  {
    room_id: 27511091,
    name: ''
  },
  {
    room_id: 24530513,
    name: ""
  },
    {
    room_id: 1813441852,
    name: ""
  },
  {
    room_id: 25512443,
    name: ""
  }
]


function getLiveRoomData (room_id) {
  const url = `https://api.live.bilibili.com/xlive/web-room/v1/index/getInfoByRoom?room_id=${room_id}`;
  // 配置请求头
   const options = {
      headers:{
        // 伪装成浏览器访问
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://live.bilibili.com/?spm_id_from=333.788.0.0',
        // 使用真实Cookies进行访问
        'Cookie': "buvid3=901E1871-40C3-F837-4C10-9E46D5D2C9AF57548infoc; b_nut=1790608157; _uuid=D6386E48-9BC10-E3A7-B63E-AF71211AD101556531infoc; home_feed_column=5; browser_resolution=1458-747; buvid_fp=8a6aa647b65d247a924bed240babf780; bili_ticket=eyJhbGciOiJIUzI1NiIsImtpZCI6InMwMyIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3OTA4NjczNTksImlhdCI6MTc5MDYwODA5OSwicGx0IjotMX0.aMNduNKUBjgx315grRX3SYpy9i8OitPyHP_GdEOIXgg; bili_ticket_expires=1790867299; buvid4=93B1E08C-F2C6-7857-77E4-458D7ECA5DCA18272-026010820-rWG27S8VM8w0YvPdKPlDmw%3D%3D; SESSDATA=a83280bd%2C1806208944%2Cea602%2A91CjDdOyEJSGvipELSCRU23smYcI9KnQOjRVehBSLuASR9WbGgpEDX4o_uKKImvWPyZa0SVnhjQTJVNTEwRFlTaVpCNjdVNEpoLVg4eEpPRHNnMEc2ZXlCaE1oT3VwSU9MbUhtLUcwaURjRDFnTG8tUnVVdVBmYndxOU01bVAtMUJ4SXpOLU4wM1NBIIEC; bili_jct=1f2c0e6829c93c1dde87f2bff8eef056; DedeUserID=34966405; DedeUserID__ckMd5=ef06bf889de689ec; CURRENT_QUALITY=0; sid=7qfjpimi; rpdid=|(kmRlm|Y|RY0J'u~m|YY|YRu; LIVE_BUVID=AUTO5017906617789623; bp_t_offset_34966405=1253422300519202816; CURRENT_FNVAL=4048; PVID=8; b_lsid=E10EBD99_1A0ECC8E651"
        }
   };
  https.get(url,options, res => {
    let body = '';

    res.on('data', (chunk) => {
      body += chunk
    });

    res.on('end', () => {
      try {
        const json = JSON.parse(body);
        parseRoomData(room_id, json);
        //console.log('请求成功', json);
      } catch (error) {
        console.error('解析失败，收到内容：', body);
        console.error(error.message);
      }
    })
  }).on('error', (e) => {
    console.log(room_id);
    console.error('网络错误', e);
  });
};

function parseRoomData (room_id, json) {
  // 如果房间号没有对应的直播间 data 就是 null；如果参数错误就没有 data
  if (json.data === null || json.data === undefined) {
    return
  }

  const room = room_list.find(data => data.room_id === room_id)
  room.cover = json.data.room_info.cover
  room.avatar = json.data.anchor_info.base_info.face
  room.title = json.data.room_info.title
  if (!room.name) {
    room.name = json.data.anchor_info.base_info.uname
  }

  // 当直播状态变化时显示通知
  const status = json.data.room_info.live_status
  if (status !== room.status) {
    room.status = status
    switch (status) {
      case 0:
        showNotify(room, '{name}尚未开播')
        break
      case 1:
        showNotify(room, '{name}正在直播')
        break
      case 2:
        showNotify(room, '{name}正在轮播')
        break
      default:
        console.log(`不明状态码status ${status}`)
    }
  }
}

async function showNotify (room, title) {
  // 替换 title 里的转义代码
  // {name} {title} {room_id}
  title = title.replace('{name}', room.name)
    .replace('{title}', room.title)
    .replace('{room_id}', room.room_id)

  const date = new Date().toLocaleString()
  console.log(`${title} ${room.title} ${date}`)

  const fileName = path.resolve(__dirname + `/avatar_${room.room_id}.jpg`)
  await saveFile(room.avatar, fileName)

  notifier.notify({
    title: title,
    message: room.title,
    icon: fileName,
    sound: true,
    wait: true
  },
    function (err, response) {
      // response 在 Windows 上的值有 3 种：
      // 点击通知：activate
      // 点击 x 关闭：dismissed
      // 等待超时：timeout
      if (response === 'activate') {
        const URL = `https://live.bilibili.com/${room.room_id}`
        openURL(URL)
      }
    }
  )
}

async function saveFile (url, fileName) {
  return new Promise((resolve, reject) => {
    // HTTPS加密访问
    if (url.startsWith('http:')) {
      url = url.replace('http:', 'https:')
    };
    const options = {
      headers:{
        // 伪装成浏览器访问
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://live.bilibili.com/?spm_id_from=333.788.0.0',
        // 使用真实Cookies进行访问
        'Cookie': "buvid3=901E1871-40C3-F837-4C10-9E46D5D2C9AF57548infoc; b_nut=1790608157; _uuid=D6386E48-9BC10-E3A7-B63E-AF71211AD101556531infoc; home_feed_column=5; browser_resolution=1458-747; buvid_fp=8a6aa647b65d247a924bed240babf780; bili_ticket=eyJhbGciOiJIUzI1NiIsImtpZCI6InMwMyIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3OTA4NjczNTksImlhdCI6MTc5MDYwODA5OSwicGx0IjotMX0.aMNduNKUBjgx315grRX3SYpy9i8OitPyHP_GdEOIXgg; bili_ticket_expires=1790867299; buvid4=93B1E08C-F2C6-7857-77E4-458D7ECA5DCA18272-026010820-rWG27S8VM8w0YvPdKPlDmw%3D%3D; SESSDATA=a83280bd%2C1806208944%2Cea602%2A91CjDdOyEJSGvipELSCRU23smYcI9KnQOjRVehBSLuASR9WbGgpEDX4o_uKKImvWPyZa0SVnhjQTJVNTEwRFlTaVpCNjdVNEpoLVg4eEpPRHNnMEc2ZXlCaE1oT3VwSU9MbUhtLUcwaURjRDFnTG8tUnVVdVBmYndxOU01bVAtMUJ4SXpOLU4wM1NBIIEC; bili_jct=1f2c0e6829c93c1dde87f2bff8eef056; DedeUserID=34966405; DedeUserID__ckMd5=ef06bf889de689ec; CURRENT_QUALITY=0; sid=7qfjpimi; rpdid=|(kmRlm|Y|RY0J'u~m|YY|YRu; LIVE_BUVID=AUTO5017906617789623; bp_t_offset_34966405=1253422300519202816; CURRENT_FNVAL=4048; PVID=8; b_lsid=E10EBD99_1A0ECC8E651"
        }
   };
    // 同上，GET请求也要带请求头
    https.get(url, options, (res) => {
      // 下载失败则停止下载。
      if (res.statusCode !== 200) {
        console.error(`头像下载失败，返回状态码：${res.statusCode}`);
        resolve();
        return;
      }
      const file = fs.createWriteStream(fileName);
      res.pipe(file);
    
    //等待文件完全关闭后才resolve
    file.on('close',() => {
      resolve();
    });
   file.on('error', (err) => {
    file.destroy();
    console.error("文件写入错误：", err.message);
    resolve();
   });
  }).on("error",(err) => {
    // 网络错误时防止程序卡死
    console.error("头像下载网络错误：", err.message);
    resolve();
  });
  });
}
    /*
      file.on('finish', () => {
        file.close()
        resolve()
      })
    }).on("error", (err) => {
      console.log("Error: ", err.message)
    })
  })
}
    */
function openURL(url) {
  open(url).catch((err)=>{
    console.error('无法打开URL：', err);
  });
}
/*
function openURL (url) {
  // 判断平台
  switch (process.platform) {
    // Mac 使用 open
    case "darwin":
      child_process.spawn('open', [url])
      break
    // 我在 Windows 上使用 spawn 报错了，改为使用 exec
    case "win32":
      child_process.exec(`start ${url}`)
      break
    // Linux 等使用 xdg-open
    default:
      child_process.spawn('xdg-open', [url])
  }
}
*/

// 启动
const room_list = config.map(cfg => {
  return {
    room_id: cfg.room_id,
    name: cfg.name,
    status: 0,
    cover: '',
    avatar: '',
    title: '',
  }
})

let time_start = 0
const add = 500 // 毫秒，如果有多个直播间，则每次请求错开一段时间，避免拥挤
const interval = 60000  // 毫秒，每个直播间隔多长时间查询一次

console.log('监控以下直播间：')
room_list.forEach(room => {
  const tab = String(room.room_id).length < 8 ? '\t\t' : '\t'
  console.log(`${room.room_id}${tab}${room.name}`)
  const current_delay = time_start
  time_start += add
  
  setTimeout(() => {
    // 启动时立即查询一次
    getLiveRoomData(room.room_id)

    // 然后定时查询
    setInterval(() => {
      getLiveRoomData(room.room_id)
    }, interval)
  }, current_delay)
})