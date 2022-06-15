


Import-Module ActiveDirectory
$ErrorActionPreference = 'SilentlyContinue'
$searchBase = 'OU=Computers,OU=Tysons Corner,DC=IGEN,DC=LOCAL'
$computers = Get-ADComputer -Filter * -SearchBase $searchBase
Clear-Content

ForEach ($cpuName in $computers.Name)
{
    If (Test-Connection $cpuName -Count 1 -Quiet)
    {
        If ((Get-Service remoteregistry -ComputerName $cpuName).Status -ne 'Running')
        {
            Set-Service -Name remoteregistry -Computer $cpuName -StartupType Automatic
            Get-Service remoteregistry -ComputerName $cpuName | Set-Service -Status Running
        }
        
        $reg = [Microsoft.Win32.RegistryKey]::OpenRemoteBaseKey('LocalMachine', $cpuName)
        $regKey = $reg.OpenSubKey("SOFTWARE\\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\Cisco AnyConnect Secure Mobility Client")
        $version = $regKey.GetValue("DisplayVersion")
        Write-Host $cpuName $version <# | OutFile -Encoding Unicode -FilePath ".\CiscoAnyConnectVersionLog.txt" -Append#>
    }
    else {
        Write-Host "$cpuName Offline"
        #"$cpuName Offline" | Out-File -Encoding Unicode -FilePath ".\CiscoAnyConnectVersionLog.txt" -Append
    }
}