




Import-Module ActiveDirectory
Remove-Variable * -ErrorAction SilentlyContinue
$ErrorActionPreference = 'SilentlyContinue'
$month = (Get-Date -Format MM)+" "+(Get-Date -Format MMMM)
$date = Get-Date -Format yyyy-MM-dd
$logArray = @()
$mobileCount = 0
$updatedCount = 0
$notUpdatedCount = 0
$equalCount = 0

$path = "[PATH]"
$airwatchPath = "$path\Logs\AirWatch"
$airwatchImport = "$airwatchPath\AirWatch_Import.csv"
$logFile = "$airwatchPath\Logs\$month - Airwatch Import.log"
$recoveryFile = "$airwatchPath\Recovery\$month - Airwatch Import Recovery.csv"
$dumpFile = "$airwatchPath\Dumps\$date-Airwatch_AD_Dump.csv"
if (!(Test-Path $logFile)) {New-Item $logFileAW -ItemType file | Out-Null}
if (!(Test-Path $recoveryFile))
{
    New-Item $recoveryFile -ItemType file | Out-Null
    "{0},{1},{2},{3}" -f "User","Old_Mobile","New_Mobile","Date" | Add-Content $recoveryFile
}
if (!(Test-Path $dumpFile))
{
    New-Item $dumpFile -ItemType file | Out-Null
    "{0},{1},{2},{3},{4},{5},{6},{7},{8}" -f "User","Dept","Site","Email","Mobile","O365","Model","OS","Last Changed" | Add-Content $dumpFile
}
    
#ARCHIVE FILES!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!


if (Test-Path $airwatchImport)
{
    $numbers = Import-Csv $airwatchImport | Sort Time,Date -Descending | Sort SAM -Unique
    Move-Item -Path $airwatchImport -Destination "$airwatchPath\Imports"
    "$date Data Imported From AirWatch" | Add-Content $logFile
}
else {$numbers = Get-ADUser -Filter {(EmployeeID -NotLike "*N/A*") -and (MobilePhone -ne 0) -and (Enabled -eq $true)} -Properties MobilePhone | Sort SamAccountName}

foreach ($number in $numbers)
{
    $sam = $number.SamAccountName
    $newMobile = $number.MobilePhone
    $user = Get-ADUser $sam -Properties *

    if ($user -or ($user -ne 0) -or ($user -ne $null))
    {
        $mobileCount++
        $cn = $user.CN
        $site = $user.CanonicalName -replace "[DOMAIN]/" -replace "/$cn" -replace "[GREEN]/Users And Groups/" -replace "ENDUSERS/" -replace "[HQ]/" -replace "[OCONUS]/" -replace "ENDUSERS_Pilot/"
        $site = $site.Substring(0, $site.IndexOf('/'))
        $dept = $user.Department
        $email = $user.EmailAddress
        $oldMobile = $user.MobilePhone
        $EA6 = $user.extensionAttribute6 -replace ", ","/" -replace ",","/" -replace " ","/"
        $EA7 = $user.extensionAttribute7
        $EA8 = $user.extensionAttribute8
        $whenChanged = $user.whenChanged

        if ($newMobile -ne $oldMobile)
        {
            while ($newMobile -ne $mobile -and $tries -lt 5)
            {
                Start-Sleep $i; $i++
                Set-ADUser $sam -MobilePhone $newMobile
                $mobile = (Get-ADUser $sam -Properties).MobilePhone
            }
            if ($newMobile -eq $mobile) {$line = "$date $sam mobile number updated from $oldMobile to $mobile."; $updatedCount++}
            else {$line = "$date $sam mobile number did NOT update from $mobile to $newMobile."; $notUpdatedCount++}
            "{0},{1},{2},{3}" -f $sam,$oldMobile,$mobile,$date | Add-Content $recoveryFile
        }
        else {$equalCount++; $mobile = $oldMobile}
        if ($line) {$logArray += $line; $line = $null}
    }
    "{0},{1},{2},{3},{4},{5},{6},{7},{8}" -f $sam,$dept,$site,$email,$mobile,$EA6,$EA7,$EA8,$whenChanged | Add-Content $dumpFile
}
if ($equalCount -eq $numbers.Count) {$logArray += "$date No AirWatch numbers imported."}
else {$logArray += "Mobile Numbers Correct = $equalCount / Mobile Numbers Updated = $updatedCount / Mobile Numbers NOT Updated = $notUpdatedCount"}
$logArray+"`n" | Add-Content $logFile

$MBX = [GROUP EMAIL]
$awMBX = [AIRWATCH EMAIL]
$subject = "Airwatch AD Dump File Ready - $mobileCount User Accounts"
$link = "<a href='$airwatchPath\Dumps'>HERE</a>"
$adBody = "Log files available $link"
$awBody = "See attachment."
$smtp = [SMTP]
Send-MailMessage -From $MBX -To $MBX -Subject $subject -BodyAsHtml $adBody -SmtpServer $smtp
Send-MailMessage -From $MBX -To $awMBX -Subject $subject -BodyAsHtml $awBody -Attachments $dumpFile -SmtpServer $smtp
