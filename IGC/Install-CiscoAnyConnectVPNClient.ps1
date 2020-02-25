



Import-Module ActiveDirectory
$ErrorActionPreference = 'SilentlyContinue'
$searchBase = [OU DISTINGUISHED NAME]
$computers = Get-ADComputer -Filter * -SearchBase $searchBase
$filePath = [PATH TO MSI FILE]
$currentVersion = '3.1.12020'
$registryPath = 'HKLM:\Software\Classes\Installer\Products\51A61408B41252F40A52DEE67865132F'

ForEach ($computer in $computers)
{
    If (Test-Connection $computer.Name -Count 1 -Quiet)
    {
        $cpuName = $computer.Name
        $reg = [Microsoft.Win32.RegistryKey]::OpenRemoteBaseKey('LocalMachine', $cpuName)
        $regKey = $reg.OpenSubKey("SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\CiscoAnyConnect Secure Mobility Client")
        $vpnVersion = $regKey.GetValue("DisplayVersion")
        $installPath = "\\$cpuName\c$\Users\Public\Desktop"
        
        #TIME TO PSEXEC

        If ($vpnVersion -ne $currentVersion)
        {
            Set-Service -Name winrm -Computer $cpuName -StartupType Automatic | Wait-Process
            Get-Service winrm -Computer $cpuName | Set-Service -Status Running | Wait-Process
            Copy-Item $filePath -Destination $installPath -Force
            
            If (Invoke-Command -ComputerName $cpuName -ScriptBlock {Test-Path $registryPath}) 
            {
                Invoke-Command -ComputerName $cpuName -ScriptBlock {Remove-Item $registryPath -Force -Recurse -Confirm:$false}
            }
            Else {Write-Host "$cpuName does not have registry key."}

            Invoke-Command -ComputerName $cpuName -ScriptBlock {Start-Process $filePath -PassThru | Wait-Process}
            $vpnVersion = $regKey.GetValue("DisplayVersion")
            Write-Host $cpuName "Installed v$vpnVersion."
            Remove-Item $installPath -Force -Recurse -Confirm:$false
            
        
        }
        Else {Write-Host "$cpuName already installed current version."}


    
    }
    Else {Write-Host "$cpuName Offline"}
}