




$date = Get-Date -Format yyyy-MM-dd
$path = [MONITORING SCRIPTS OU]
$backupFile = "$path\Logs\Backups\$date - User Group Backups.csv"
New-Item $backupFile -ItemType file
"{0},{1}" -f "SamAccountName","MemberOf" | Add-Content $backupFile

$users = Get-ADUser -Filter * -Properties MemberOf | Sort
$i = 0
foreach ($user in $users)
{
    $percentComplete = $i/$user.count
    Write-Progress "Processing Users: $percentComplete complete"
    $sam = $user.SamAccountName
    $user = '[SAMACCOUNTNAME]'
    $groups = Get-ADPrincipalGroupMembership $user
    $groupArray = @()
    foreach ($group in $groups)
    {
        $group = $group -replace 'CN='
        $group = $group.Substring(0, $group.IndexOf(','))
        $groupArray += $group+";"
    }
    $groupArray
    
    foreach ($group in $groups)
    {
        $groupName = $group.Name
        "$sam,$groupName" | Add-Content $backupFile
    }
    $i++
}

