type:
	cmd.exe /c '.\node_modules\.bin\quicktype --src src\schema.json --src-lang schema -l ts -o src\CustomTypes.ts'
	sed  -i '1i /* eslint-disable */' src/CustomTypes.ts

build:
	powershell .\build.ps1
