## GWT
GIVEN：
~/Document/exist.txt 
~/Document/exist/index.js
~/Document/.hiddenfile.txt

 

WHEN：my-ls
THEN：
exist.txt      exist      

WHEN：my-ls -a
THEN：
exist.txt       exist       .hiddenfile.txt

WHEN：my-ls non-exist.txt
THEN：
process.stderr.write 、process.exit(3)

WHEN：my-ls -l
THEN：
exist.txt       -        isDir=false
exist        10MB     isDir=true

WHEN：my-ls m*.mp3 --regex
THEN：
process.stderr.write 、process.exit(3)

WHEN：my-ls e* -lr
THEN：
exist.txt              -             isDir=false
exist                  20MB.     isDir=true

 

WHEN：my-ls -la -h -v
THEN：help 內容

WHEN：my-ls -la -v -h
THEN：version

 

WHEN：my-ls -la 
THEN：
exist.txt              -             isDir=false
exist                   10MB.     isDir=true
.hddenfile.txt        -           isDir=false

 

WHEN：my-ls exist.txt .hiddenexist.txt -a
THEN：
.hddenfile.txt
exist.txt 

 

WHEN：my-ls exist.txt exist
THEN：（資料夾會列出第一層裡面的內容，參考 ls）
exist.txt 

exist:
index.js


WHEN：my-ls exist.txt --output=json --output=classic
THEN：後面會覆蓋前面的（參考 ls）

WHEN：--output=json
THEN：看上面的 json 範例

WHEN：my-ls exist/index.js
THEN：要可以找 path(參考 ls)
exist/index.js


WHEN：my-ls --regex -l e*
THEN：不受 args 和 flag 先後順序影響（參考 ls）
exist.txt              -             isDir=false
exist                  20MB.     isDir=true

WHEN：my-ls --123
THEN：(參考 ls)
ls: -123: No such file or directory

 

WHEN：my-ls path








## 專案架構（參考 salesforcecli）


|-- docs    // 相關文件
|   |-- spec.md
|-- bin
|   |--cli.js // 入口點，要放在 package.json 中，並引用 index.js
|-- src
|   |-- index.js  // 解析參數、呼叫 core.js、回傳，只處理 I/O
|   |-- core.js   // 核心的呼叫邏輯，會根據 flags 做不同的事情
|   |-- utils
|        |-- ...
|   |-- constants
|        |-- ..
|-- package.json
 








## TECH STACK
pnpm

node

json-colorizer


## TODO
畫圖