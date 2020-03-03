
#THIS REQUIRES A LOG SERVER SET UP WITH EVENTS FORWARDED



$newItem = [SAMACCOUNTNAME]
$obj = Get-ADUser $newItem -Properties *

$logServer = [LOG SERVER]
$objDN = $obj.DistinguishedName
$objType = $obj.ObjectClass
$objCreated = $obj.Created
$objMod = $obj.Modified
$days = ((Get-Date)-$objCreated).Days

if ($days -eq 0)
{
    $event = Get-WinEvent -ComputerName $logServer -FilterHashTable @{LogName = "ForwardedEvents"; Id=5137; StartTime = $objCreated; EndTime = $objCreated.AddSeconds(60)} | fl -Property Message
}

$msg = $msg.Substring(0, $msg.IndexOf('Account Domain'))
$msg = $msg.Substring($msg.IndexOf('Account Name:'))
$msg = $msg -replace "Account Name:", ""
$msg = $msg.Trim()
$admin = Get-ADUser $msg -Properties *
$adminNum = $admin.EmployeeNumber
$user =  Get-ADUser -Filter {EmployeeID -eq $adminNum} -Properties *
$user = Get-ADUser $user -Properties *
$userEmail = $user.EmailAddress





else
{
    $msg = Get-WinEvent -ComputerName $logServer -FilterHashTable @{LogName = "ForwardedEvents"; Id=5136; StartTime = $objMod; EndTime = $objMod.AddSeconds(15)} | fl -Property Message | Out-String

}

Write-Host "Searching Events after $objCreated ..."

$msg | Select-String -Pattern $newItem
$newItem = 'testuser3'
New-ADUser $newItem
$time = 60
while ($time -gt 0)
{
    Start-Sleep -Seconds 1
    $time --
    Clear-Host
    Write-Host $time + $objectType + $objectCreated
}