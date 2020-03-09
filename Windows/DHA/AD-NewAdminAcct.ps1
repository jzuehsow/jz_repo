




##############################################################################################################################################################
<# 
Author - 
Purpose - Creation of new admin accounts.

Change Log:
v1 9/19/2017 - Production testing.

01/12/2018 - disabled admin creation script, please see for more information



#>                         
##############################################################################################################################################################
$version = "1.0"
$banner = "
----------------------------------------------------------------------------------------------------------------------
----------------------------------------------------------------------------------------------------------------------                                                                                                                     

                                      - Admin Account Creation $version
                                                                                                                                                                              
----------------------------------------------------------------------------------------------------------------------
----------------------------------------------------------------------------------------------------------------------




"
Clear-Host;$banner

$pdc = (Get-ADDomain).PDCEmulator
$PSDefaultParameterValues = @{"*-AD*:Server"="$pdc"}

$pshost = get-host;$pswindow = $pshost.UI.RawUI;$newsize = $pswindow.BufferSize;$newsize.Height = 65;$newsize.Width = 120;$pswindow.BufferSize = $newsize
$rmwid=[System.Security.Principal.WindowsIdentity]::GetCurrent();$rmprp=new-object System.Security.Principal.WindowsPrincipal($rmwid)
$rmadm=[System.Security.Principal.WindowsBuiltInRole]::Administrator;$rmisadm = $rmprp.IsInRole($rmadm)

$rmadm = $env:username;$rmsvr = $env:COMPUTERNAME
$rmgptest = Get-ADPrincipalGroupMembership $rmadm | select name | where {$_.name -like "*[ADMIN GROUP]"}

If (!$rmgptest){Write-Host "Only members of MDSU administrative groups are allowed to run this script." -F Red;Pause;Exit}
#If ("" -ne $rmsvr){Write-Host "As a breakfix, the provisioning script must be ran from ." -F Red;Pause;Exit}
If ($rmisadm -eq $false){Write-Host "Powershell not running as administrator." -F Red;Pause;Exit}

Write-Host Admin Creation Script has been disabled until further notice, please see your immediate supervisor, thank you

Pause;Exit

$ErrorActionPreference = "SilentlyContinue"
$WarningPreference = "SilentlyContinue"


##############################################################################################################################################################
# Input and variables
##############################################################################################################################################################

Do
{
$rmuser = Read-Host "Enter the username of the persons regular account who will recieve the admin account"
$rmuser = $rmuser.toupper()
    If (!($(try {Get-ADUser $rmuser -Properties EmployeeID | Where {$_.EmployeeID -like "?????????"}} catch {$null}))){Write-Host "Invalid username or account type." -F Red}
}
Until ($(try {Get-ADUser $rmuser -Properties EmployeeID | Where {$_.EmployeeID -like "?????????"}} catch {$null}))
""
Do
{
$rmclone = Read-Host "Would you like to clone the group memberships from another account?"
     If ($rmclone -ne "Y" -and $rmclone -ne "N"){Write-Host "Invalid entry." -F Red}
}
Until ($rmclone -eq "Y" -or $rmclone -eq "N")

If ($rmclone -eq "Y")
{
""
    Do
    {
    $rmadmclone = Read-Host "Enter the username for the admin account that membership will be cloned from"    
    $rmadmclone = $(try {Get-ADUser $rmadmclone -Properties MemberOf,EmployeeNumber} catch {$null})
        If ($rmadmclone.EmployeeNumber -notlike "?????????"){Write-Host "Invalid username or account type." -F Red}
    }
    Until ($rmadmclone.EmployeeNumber -like "?????????")
$rmmembership = $rmadmclone.MemberOf
}

$rmadmin = Get-ADUser $rmuser -Properties Surname,GivenName,DisplayName,Office,Title,EmployeeID,DistinguishedName,middleName
$rmSurname = ($rmadmin.Surname).ToLower()
$rmInitials = ($rmadmin.middleName).ToUpper()
$rmGivenName = ($rmadmin.GivenName).ToLower()
$rmdisplayname = $rmadmin.DisplayName
$rmoffice = $rmadmin.Office
$rmtitle = $rmadmin.Title
$rmeid = $rmadmin.EmployeeID
$rmdn = $rmadmin.DistinguishedName

If ($rmSurname){$rmSurname = (Get-Culture).TextInfo.ToTitleCase($rmSurname)}
If ($rmGivenName){$rmGivenName = (Get-Culture).TextInfo.ToTitleCase($rmGivenName)}
If ($rmInitials){$rmInitials = $rmInitials.Substring(0,1)}

$rmdisplayname = "$rmSurname, $rmGivenName (Adm)"
$rmname = $rmdisplayname
""
Do
{
$rmnmsf = Read-Host "Enter the number suffix for the username. (15-jbrown, 5-jbrown, ect.)"
$rmnewadmin = "$rmnmsf-" + $rmadmin.SamAccountName
    If ($rmnmsf -notlike "[1-9]*"){Write-Host "Invalid entry" -F Red}
}
Until ($rmnmsf -like "[1-9]*")

If ($(try {get-aduser -filter {EmployeeNumber -eq $rmeid}} catch {$null})){Write-Host "Account exists with EID $rmeid in the employee number field." -F Red;Pause;Exit}
If ($(try {get-aduser $rmnewadmin} catch {$null})){Write-Host "$rmnewadmin already exists." -F Red;Pause;Exit}
""
Do{
$rmpassword = Read-Host "Enter desired password"
    $isGood = 0
    If (-Not($rmpassword -notmatch “[a-zA-Z0-9]”)){$isGood++}
    If ($rmpassword.Length -ge 12){$isGood++}
    If ($rmpassword -match “[0-9]”){$isGood++}
    If ($rmpassword -cmatch “[a-z]”){$isGood++}
    If ($rmpassword -cmatch “[A-Z]”){$isGood++}
    If ($rmpassword -notlike “*password*”){$isGood++}
    If ($isGood -ge 6){$pass = "Y"}Else{$pass = "N"}
        If ($rmpassword -like “*password*”){Write-Host "The password cannot contain the word password." -F Red}
        ElseIf ($pass -eq "N"){Write-Host "Password does not meet complexity requirment." -F Red}
}Until ($pass -eq "Y")
$pswd = convertTo-securestring -string $rmpassword -asplaintext -force
"";""
##############################################################################################################################################################
# Locates OU
##############################################################################################################################################################

If ($rmdn -notlike "*ARCHIVE*")
{
$rmdn = $rmdn.Split(",")
$rmalldn = @()

    Foreach ($field in $rmdn)
    {
    $ou = (($field).Replace("OU=",""))

        If ($ou -like "????" -or $ou -like "?????" -and $ou -ne "HQ" -and $ou -ne "GREEN")
        {
        $ous = (Get-ADOrganizationalUnit -Filter {Name -eq $ou}).DistinguishedName
            Foreach ($ou in $ous)
            {
            $rmus = Get-ADUser -Filter * -SearchBase $ou -Properties EmployeeNumber | Where {$_.EmployeeNumber -like "?????????"}
                Foreach ($rmu in $rmus)
                {
                $dn = $rmu.DistinguishedName
                $rep = ($dn -split (",OU"))[0]
                $tmp = $dn.Replace("$rep,","")
                $rmalldn += $tmp
                }
            }
        }
    }
$rmalldn = $rmalldn | Group-Object | Sort-Object Count
$rmou = ($rmalldn | Select-Object -Last 1).Name
}
If (!$(try {Get-ADUser -Filter * -SearchBase $dn -ResultSetSize 1} catch {$null})){$rmou = $null}
If (!$rmou){$rmou = "[USERS CONTAINER]";$rmout = "Created in default users OU."}

##############################################################################################################################################################
# Creates Account
##############################################################################################################################################################

$rmparam = @{
'Path' = $rmou 
'UserPrincipalName' = "$rmnewadmin@[DOMAIN]" 
'GivenName' = $rmGivenName 
'Surname' = $rmSurname
'DisplayName' = $rmdisplayname 
'AccountPassword' = $pswd 
'ChangePasswordAtLogon' = $true 
'Enabled' = $true 
'EmployeeID' = $rmeid
'Initials' = $rmInitials
'Title' = $rmtitle
'Office' = $rmoffice}

New-ADUser $rmnewadmin @rmparam
Get-aduser $rmnewadmin | Rename-ADObject -NewName $rmname 
If ($rmmembership){Foreach ($group in $rmmembership){Add-ADGroupMember $group -Members $rmnewadmin}}

If ($(try {Get-ADUser $rmnewadmin} catch {$null})){Write-Host "Admin account $rmnewadmin created." -F Green;Write-Host $rmout -F Red}
Else {Write-Host "Failed to created admin account." -F Red}

Remove-Variable rm* -Force    ;"";"";""
Write-Host "----------------------------------------------------------------------------------------------------------------" -F Green
Write-Host "Admin account created........." -F Green
Write-Host "----------------------------------------------------------------------------------------------------------------" -F Green
Pause
##############################################################################################################################################################
# End                     
##############################################################################################################################################################