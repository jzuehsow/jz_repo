



$serialNumber = (Get-WmiObject -Class Win32_PhysicalMedia | ? {$_.Tag -like "*PHYSICALDRIVE1*}).serialNumber
$deviceInstancePath = (Get-WmiObject -Class Win32_PnPEntity -Namespace "root\cimv2" | {$_.CompatibleID -like "*USBSTOR*}).DeviceID
$date = Get-Date -Format M.d.yy
$alloyFile = 'c80 Master 11.1.16 Lab 251 Conf.xlsx'
$dlpFile = "c80 DLP Exception $date.txt"
$alloyFilePath = "\\BangeMEDev1\Dept80IT\Share\Alloy\$alloyFile"
$dlpFilePath = "\\BangeMEDev1\Dept80IT\Share\DLP\$dlpFile"

If (!(Test-Path $alloyFilePath))
{
    New-Item $dlpFilePath
    Write-Host "File $dlpFile created."
}
Add-Content $local\$dlpFile -Value $deviceInstancePath `r`n
Write-Host "Added content for $deviceInstancePath."

If (!(Test-Path $alloyFilePath))
{
    #append to end
    #prompt asset number
}
Else {Write-Host "Failed to append alloy file."}