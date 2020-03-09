




$user = Read-Host "Enter username"

$user = Get-ADUser $user -Properties *
$sam = $user.SamAccountName
$oldEA6 = $user.extensionattribute6
Write-Host `n"$sam extensionattribute6 is $oldEA6." -F Green
$EA6 = $user.extensionattribute6 -replace ",GADS"
Do
{
    Set-ADUser $user -Replace @{extensionattribute6=$EA6}
    $newEA6 = (Get-ADUser $user -Properties extensionattribute6).extensionattribute6
}
Until ($newEA6 -eq $EA6)

Do
{
    Write-Host `n"$sam extensionattribute6 changed to $newEA6."`n -F Green
    $modEA6 = Read-Host "If this is correct, press 'Enter' to exit, or type the correction here"
}
Until ($modEA6 = "")

Exit