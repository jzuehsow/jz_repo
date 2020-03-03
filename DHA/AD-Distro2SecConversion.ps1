




$date = Get-Date -Format yyyyMMdd
$logFile = "[LOG PATH]\Distro_Converstion_Error_Log_$date.log"
$distros = (Get-ADGroup -Filter {GroupCategory -eq 'Distribution'}).SamAccountName
New-Item $logFile -ItemType file | Out-Null

foreach ($distro in $distros)
{
    try {Set-ADGroup $distro -GroupCategory Security -GroupScope Universal}
    catch
    {
        "ERROR setting $distro type." | Write-Host
        "ERROR setting $distro type." | Add-Content $logFile
    }
}