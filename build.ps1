# create version string
$version = Get-Date -Format "yyyy.MMdd.HHmm"

# print version
Write-Host "Version: $version"

# update version in `release/app/package.json`
# 这里不用powershell的ConvertTo-Json ，因为它的缩进有问题
$version | python -c "import json; f=open('release/app/package.json','r+',encoding='utf-8'); d=json.load(f); d['version']=input(); f.seek(0); json.dump(d,f,indent=2,ensure_ascii=False); f.truncate()"

# show content of `release/app/package.json`
Get-Content 'release/app/package.json'

# if 'assets/puppeteer_chrome/' does not exists, copy from $HOME\.cache\puppeteer\chrome\win64-117.0.5938.92\chrome-win64
if (!(Test-Path 'assets/puppeteer_chrome/')) {
  Copy-Item -Path "$HOME\.cache\puppeteer\chrome\win64-117.0.5938.92\chrome-win64" -Destination 'assets/puppeteer_chrome/' -Recurse
}

npm run package

# commit `release/app/package.json` and `release/app/package-lock.json`
git add release/app/package.json release/app/package-lock.json
git commit -m "chore: bump version to $version"

# create tag with version
git tag "wxlive-spy@$version" -m "chore: bump version to $version"

# push to remote
git push origin "wxlive-spy@$version"

./node_modules/.bin/sentry-cli releases files "wxlive-spy@$version" upload-sourcemaps .\release\app\
