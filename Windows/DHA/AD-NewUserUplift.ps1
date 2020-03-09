


Set-Location $PSScriptRoot
.".\Config\Common.ps1"

Start_Script
$exportADCSVPath = "[EXPORT PATH OF CSV]"
$exportADCSV = "AD_Export.csv"
$upliftPath = "[TARGET FOLDER OF UPLIFT FILES]"
$newUserListPath = "[EXPORT PATH OF NEW USERS CSV]"
$newUserListFile = Get-ChildItem $newUserListPath | Sort CreationTime -Descending | Select -First 1
$newUserListCSV = $newUserListFile.Name -replace ".txt", ".csv"
$upliftURL = "[UPLFIT URL]"
$upliftDomain = "[TARGET DOMAIN TO UPLIFT FILES TO]"
$oldFiles = Get-ChildItem $upliftPath -File "*.csv"

ForEach ($oldFile in $oldFiles) {Move-Item "$upliftPath\$oldFile" -Destination "$tsLiftPath\Completed" -Force}

Copy-Item "$exportADCSVPath\$exportADCSV" -Destination $upliftPath
(Get-Content "$newUserListPath\$newUserListFile" | Select-Object -Skip 3) | Set-Content "$upliftPath\$newUserListCSV"

$user = Get-ADUser $env:USERNAME -Properties *
IF ($user.EmployeeID) {$email = $user.EmailAddress}
Else {$EID = $user.EmployeeNumber; $email = (Get-ADUSer -Filter {EmployeeID -eq $EID} -Properties EmailAddress).EmailAddress}

$email = ($email.Substring(0, $email.IndexOf('@'))
$email = "$email@$upliftDomain"

Write-Host "Files copied to " -NoNewLine; Write-Host "$tsLiftPath" -F Cyan
Write-Host "`n`t1. Path to files copied to clipboard." -F Yellow
Write-Host "`n`t2. Press Enter to continue uplifting files to your $email account." -F Yellow
Write-Host "`n`t3. Click 'Browse' and 'Paste' into search bar in Windows Explorer to go to uplift staging location.`n" -F Yellow

$ie = New-Object -ComObject internetexplorer.application
$ie.visible = $true
$ie.navigate($upliftURL)
Start-Sleep 1
($ie.document.getElementsByName("email") | Select -First 1).Value = $email
Set-Clipboard $upliftPath

Stop_Script