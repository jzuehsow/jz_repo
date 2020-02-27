################################################################################################################################
#  Multi-factor Authentication (MFA) - Removal of an Individual User from a PERMANENT MFA Exemption
#  MFA_Exempt_Remove_Perm_Exemption_from_Individual_User.ps1
#  February 27, 2019
#
#  This script is used to remove a PERMANANT MFA exemption for an individual user.
#  The script will remove the user from the proper exemption group and remove the Active Directory attributes that 
#  are assigned to identify the user as having been granted a permanent exemption.
#  
#
#  No changes are required to be made to any configuration settings to be able to utlize this script on either domain
#  (the script will automatically determine which enclave this is being used for).
#
################################################################################################################################

################################################################################################################################
# Validate administrator executing script has permisions to execute the script
################################################################################################################################
If (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(`
    [Security.Principal.WindowsBuiltInRole] "Administrator"))
{
    Write-Warning "You do not have Administrator permissions to execute this script!`nPlease execute this script as an Administrator!"
    sleep 20
    Break
}

################################################################################################################################
# Determine Default Naming Context for domain
################################################################################################################################
Import-Module activedirectory
$siteservers = $null
$domainname = (Get-ADDomain -current LocalComputer).dnsroot

if ($domainname -eq "[DOMAIN]]") {
    $log_path = "[LOG PATH]"
    }
    Elseif ($domainname -eq "[DOMAIN]") {
        $log_path = "[LOG PATH]"
        } Else {
            $output = "Error:  A valid domain ($domainname) cannot be found.  The removal of a PERMANENT MFA Exception cannot be processed at this time."
            write-host $output
            Exit
            }

################################################################################################################################
# Set Variables
################################################################################################################################
$perm_RSA_Ex_group = "[MFA PERM EXEMPT GROUP]"
$date = get-date
$dateforlog = Get-date -format yyyy-MM-dd
$logname = "MFA_Exempt_PERM--$dateforlog.txt"
$logpathout = $log_path + $logname
$serv2use = (Get-ADDomainController -Discover -Service "PrimaryDC").name

################################################################################################################################
# Set Date, Time and Time Zone
################################################################################################################################
<#
# Log local date/time information based on site being selected for user
$time = get-date -format "yyyy-MM-dd HH:mm:ss"
# Automatically determine Standard or Daylight Time
$daylighttime = (Get-Date).IsDaylightSavingTime()
If ($daylighttime -eq 1) {
$timezone = [system.timezoneinfo]::Local.DaylightName
    }
    Else {$timezone = [system.timezoneinfo]::Local.StandardName
    }
# Set Time Zone Abbreviations
$timezoneabr = ($timezone -split " " |% { $_[0] }) -join ""
If ($timezoneabr -eq "AST") {
    $timezoneabr = "AKST"
    }
$DateString = "$time $timezoneabr"
#> 
    
# Log Eastern Time as date/time information for logging    
$timeET = [System.TimeZoneInfo]::ConvertTimeBySystemTimeZoneId($(Get-Date), [System.TimeZoneInfo]::Local.Id, 'Eastern Standard Time')
$daylighttimeET = $timeET.IsDaylightSavingTime()
$timeET = $timeET.tostring("yyyy-MM-dd HH:mm:ss")
If ($daylighttimeET -eq 1) {
$timezoneET = [System.TimeZoneInfo]::FindSystemTimeZoneById("Eastern Standard Time").DaylightName
    }
    Else {$timezoneET = [System.TimeZoneInfo]::FindSystemTimeZoneById("Eastern Standard Time").StandardName
    }
# Set Time Zone Abbreviations
$timezoneabrET = ($timezoneET -split " " |% { $_[0] }) -join ""
If ($timezoneabrET -eq "AST") {
    $timezoneabrET = "AKST"
    }
$DateStringET = "$timeET $timezoneabrET"

################################################################################################################################
# Implement Removal of Exemption
################################################################################################################################    
do {
    [void][System.Reflection.Assembly]::LoadWithPartialName('Microsoft.VisualBasic') 
    $name = [Microsoft.VisualBasic.Interaction]::InputBox("Enter User logon name", "MULTI-FACTOR AUTHENTICATION REMOVAL", "Type STOP to exit")
    if (($name -eq "STOP") -or ($name -eq "Type STOP to exit") -or  ($name -eq "")) {exit}
    try { $test = get-aduser $name -Properties samaccountname,displayname,distinguishedname} catch {[System.exception]"Error"}
}
while ($test -like "")

try {    
remove-ADGroupMember $perm_RSA_Ex_group -Members $name -Server $serv2use -ErrorAction SilentlyContinue -Confirm:$false
set-aduser $name -Server $serv2use -clear "[MFA ATTRIBUTE 1]]" -ErrorAction SilentlyContinue
set-aduser $name -Server $serv2use -clear "[MFA ATTRIBUTE 1 DESCRIPTION]" -ErrorAction SilentlyContinue
}
Catch {
$er = $_.Exception.Message    
write-host $er
write-host "'$name' could not be removed from having a MFA permanent exemption.  You may not have the required permissions to remove user or alter their attributes." -ForegroundColor yellow -BackgroundColor Red
pause
exit
}

$username = $test.SamAccountName
$userdisplayname = $test.DisplayName
$userdn = $test.DistinguishedName       
$admin = $env:USERNAME    
$output = "***PERM REMOVE*** " + "$userdisplayname" + ";" + "$username" + ";" + "$userdisplayname" + ";" + "$userdn" + ";" + $admin + ";" + $serv2use + ";" + "$DateStringET"
$output | out-file $logpathout -Append

write-host "Removed user (Username/sAMAccountName):" $username
write-host "Removed user (DisplayName):" $userdisplayname
write-host "From group:" $perm_RSA_Ex_group
write-host -ForegroundColor Yellow "Confirming Removal was applied..."
$test1 = Get-ADGroupMember -Identity $perm_MFA_Ex_group -Recursive -Server $serv2use | Select -ExpandProperty sAMAccountName
If ($test1 -contains $name) {
    write-host -ForegroundColor Red "WARNING! User is still showing as having a permanent exemption from using multi-factor authentication."
    } Else {
    write-host -ForegroundColor Green "Confirmed... User no longer has a permanent exemption from using multi-factor authentication."
    }
    
pause
