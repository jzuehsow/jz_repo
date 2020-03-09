




Import-Module ActiveDirectory
Remove-Variable * -ErrorAction SilentlyContinue
$ErrorActionPreference = 'SilentlyContinue'
$year = Get-Date -Format yyyy
$month = (Get-Date -Format MM)+" "+(Get-Date -Format MMMM)
$date = Get-Date -Format yyyy-MM-dd

$path = [MONITORING SCRIPTS PATH]
$backupPath = "$path\Logs\Backups"

function Create_Log_File
{
    $Script:logFile = "$logPath\$month - $functionName.log"
    $tries = 0
    while (!(Test-Path $logFile) -and $tries -le 5)
    {
        Start-Sleep $tries; $tries++
        New-Item $logFile -ItemType file | Out-Null
    }
}

function Groups_Backup
{
    $groups = Get-ADGroup -Filter * -Properties *
    foreach ($group in $groups)
        $hash = [pscustomobject]@{ 
        DomainController = $server
        ProcessorLoad = $procLoad
        MemoryLoad = $memLoad
        AlertCount = $serverArray[$server]}
        $table += $hash
}


$ouRoot = [ROOT OU]
$ouUsers = "[USERS OU],$ouRoot"
$ouGroups = "[GROUPS OU],$ouRoot"
$ouContacts = "[CONTACTS OU],$ouRoot"
$ouArchive = [CONTACTS OU]
$ouSARDisabled = "[DISABLED OU],$ouArchive"
$ouAdminDisabled = "[DISABLED ADMINS OU],$ouArchive"
$ouDisabled = @($ouSARDisabled,$ouAdminDisabled)

$logArray = @()
$auditTime = (Get-Date).AddDays(-7)

function Get_Time {$Script:time = Get-Date -Format HH:mm}
function Create_Log_File
{
    $Script:logFile = "$logPath\$month - $functionName.log"
    $tries = 0
    while (!(Test-Path $logFile) -and $tries -le 5)
    {
        Start-Sleep $tries; $tries++
        New-Item $logFile -ItemType file | Out-Null
    }
}
function Create_Recovery_File
{
    $Script:recoveryFile = "$logPath\Recovery\$date - $functionName Recovery.csv"
    $tries = 0
    while (!(Test-Path $recoveryFile) -and $tries -le 5)
    {
        Start-Sleep $tries; $tries++
        New-Item $recoveryFile -ItemType file | Out-Null
        $recoveryHeader | Add-Content $recoveryFile
    }
}
function Archive_Logs
{
    $logs = Get-ChildItem $logPath | ?{$_.Name -like "*$functionName*"} | Sort LastWriteTime
    $logCount = $logs.Count
    foreach ($log in $logs)
    {
        if ($logCount -gt 1)
        {
            $writeYear = ($log.LastWriteTime).year
            $destPath = "$logPath\Maintenance\$writeYear"
            $tries = 0
            if (!(Test-Path "$destPath\$log") -and $tries -le 5)
            {
                Start-Sleep $tries
                Move-Item -Path "$logPath\$log" -Destination $destPath
                $tries++
            }
            else
            {
                $i = 0
                $dupeName = $log
                while (Test-Path "$destPath\$dupeName") {$i += 1; $dupeName = $log.basename+$i+$log.extension}
                Move-Item "$logPath\$log" -Destination "$destPath\$dupeName"
            }
            $logCount--
        }
    }
}
