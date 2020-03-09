




$pshost = get-host
$pswindow = $pshost.UI.RawUI
$newsize = $pswindow.BufferSize
$newsize.Height = 120
$newsize.Width = 120
$pswindow.BufferSize = $newsize
$pswindow.BackgroundColor = "DarkBlue"
$pdc = (Get-ADDomain | Select-Object PDCEmulator).PDCEmulator;$PSDefaultParameterValues = @{"*-AD*:Server"="$pdc"}

$scriptversion = "1.0"

$banner = " ----------------------------------------------------------------------------------------------------------------------
 ----------------------------------------------------------------------------------------------------------------------                                                                                                                        

                                      Manage Security Group - Version $scriptversion
                                                                                                                                                                              
 ----------------------------------------------------------------------------------------------------------------------
 ----------------------------------------------------------------------------------------------------------------------
 
 
 
 
 
 
 
 
 "

Remove-Variable rm* -Force;Clear-Host;$banner

#########################################################################################################################################################
## Security Group Input
#########################################################################################################################################################

Do 
{
$groupname = Read-Host "Enter the name of a security group to be viewed or modified"
    If (!($(try {(Get-ADGroup $groupname)} catch {$null}))){Write-Host "Invalid group name." -F Red}
}
Until ($(try {(Get-ADGroup $groupname)} catch {$null}))

#########################################################################################################################################################
## Verifies user is manager
#########################################################################################################################################################

$pass = $false
$rmcurrentuser = $env:username
$rmmanager = (Get-ADGroup $groupname -Properties ManagedBy).ManagedBy
$rmManagerType = (Get-ADObject $rmmanager).ObjectClass
if ($rmManagerType -eq 'user')
{
    if ($(try {(Get-ADUser $rmmanager)} catch {$null})) {$rmmanager = (Get-ADUser $rmmanager).SamAccountName;if($rmcurrentuser -eq $rmmanager) {$pass = $true}}
}
elseif ($rmManagerType -eq 'group')
{
    if ((Get-ADGroupMember $rmmanager).SamAccountName -contains $rmcurrentuser) {$pass = $true}
}
if ($pass -eq $false) {Clear-Host;$banner;Write-Host "You are not the security group manager. The script will now exit." -F Red;Start-Sleep 10;Exit}

#########################################################################################################################################################
## Action Option. 
#########################################################################################################################################################

Do 
{
Remove-Variable rm* -Force;Clear-Host;$banner
Write-Host "1. Add a member." -F Green
Write-Host "2. Remove a member." -F Green
Write-Host "3. View all members." -F Green
Write-Host "4. Exit the script." -F Green;""

Do
{
$rmselection = Read-Host "Choose option number from above and press Enter"
    If ($rmselection -notlike "[1-4]"){Write-Host "Invalid selection." -F Red}
}
Until ($rmselection -like "[1-4]")

#########################################################################################################################################################
## Add member to group
#########################################################################################################################################################

If ($rmselection -eq "1")
{""
    Do
    {
    $rmuser = Read-Host "Enter the user name being added to the group"
        If (!($(try {(get-aduser $rmuser)} catch {$null}))){Write-Host "Invalid username." -F Red}
    }
    Until ($(try {(get-aduser $rmuser)} catch {$null}))

Add-ADGroupMember -Identity $groupname -Members $rmuser
"";Write-Host "$rmuser added to group." -F Green;"";Pause
}

#########################################################################################################################################################
## Remove member from group
#########################################################################################################################################################

If ($rmselection -eq "2")
{
"";Write-Host "Below are the group members:" -F Green;""
$rmusers = (Get-ADGroupMember -Identity $groupname).SamAccountName

    $i = 1
    Foreach ($rmuser in $rmusers){New-Variable -Name rmuser$i -Value $rmuser;Write-host "$i. $rmuser" -F Magenta;$i++};""     
    
    Do
    {
    $rmlinenumber =  Read-Host "Enter the line number of the user being removed and press enter, or press C to cancel"
        If ($rmlinenumber -notlike "[0-9]*" -and $rmlinenumber -notlike "c"){Write-Host "Invalid line number." -F Red}        
    }
    Until ($rmlinenumber -like "[0-9]*" -or $rmlinenumber -like "c")
     
    If ($rmlinenumber -notlike "c")
    {
    $rmuser = Get-Variable -Name rmuser$rmlinenumber -ValueOnly    
    Remove-ADGroupMember -Identity $groupname -Members $rmuser -Confirm:$false
    "";Write-Host "$rmuser removed from group" -F Green;"";Pause
    }
}

#########################################################################################################################################################
## View group memmbers
#########################################################################################################################################################

If ($rmselection -eq "3")
{
"";Write-Host "Below are the group members:" -F Green;""
$rmusers = (Get-ADGroupMember -Identity $groupname).SamAccountName
    $i = 1
    Foreach ($rmuser in $rmusers){Write-host "$i. $rmuser" -F Magenta;$i++;};"";Pause     
}

# End script lopp
}
Until ($rmselection -eq "4")
Remove-Variable rm* -Force;Exit