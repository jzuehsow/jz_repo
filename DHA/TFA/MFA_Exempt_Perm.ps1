



################################################################################################################################
#  Multi-factor Authentication (MFA) Temporary Exemption
#  MFA_Exempt_Temp.ps1
#  February 27, 2019
#
#  This script is used to exempt users from having to utilize multi-factor authentication.
#  No changes are required to be made to any configuration settings to be able to utlize this script to apply an exemption
#  to any of these enclaves (the script will automatically determine which enclave this is being used for).
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
# Determine Default Naming Context for domain and Obtain Site Container for Domain
################################################################################################################################
# Determine naming context for domain and obtain site container for domain
$configNCDN = (Get-ADRootDSE).ConfigurationNamingContext
$domainname = (Get-ADDomain -current LocalComputer).dnsroot
$siteContainerDN = ("CN=Sites," + $configNCDN)

################################################################################################################################
# Set Variables
################################################################################################################################
$temp_MFA_Ex_group = "[MFA TEMP EXEMPT GROUP]"
$target = @()
$site = $null
$sites = $null
$name = $null
$test1 = $null
$dateforlog = Get-Date -format yyyy-MM-dd
$logname = "MFA_Exempt_TEMP--$dateforlog.txt"

################################################################################################################################
# Determine Sites in Domain and Create Array of Sites for Drop Down List
################################################################################################################################
$sites = Get-ADObject -SearchBase $siteContainerDN -filter { objectClass -eq "site" } -properties "siteObjectBL", "location", "description" | select Name, Location, Description
$target += ""
foreach ($site in $sites) {
$target += $site.name
}
[array]$DropDownArrayItems = $target
[array]$DropDownArray = $DropDownArrayItems | sort

# This Function Returns the Selected Value and Closes the Form
function Return-DropDown {
    if ($DropDown.SelectedItem -eq $null){
        $DropDown.SelectedItem = $DropDown.Items[0]
        $script:Choice = $DropDown.SelectedItem.ToString()
        $Form.Close()
    }
    else{
        $script:Choice = $DropDown.SelectedItem.ToString()
        $Form.Close()
    }
}

function SelectGroup{
    [void] [System.Reflection.Assembly]::LoadWithPartialName("System.Windows.Forms")
    [void] [System.Reflection.Assembly]::LoadWithPartialName("System.Drawing")
    
    $Form = New-Object System.Windows.Forms.Form

    $Form.width = 300
    $Form.height = 150
    $Form.Text = �Where is the user sitting?�

    $DropDown = new-object System.Windows.Forms.ComboBox
    $DropDown.Location = new-object System.Drawing.Size(100,10)
    $DropDown.Size = new-object System.Drawing.Size(130,30)

    ForEach ($Item in $DropDownArray) {
     [void] $DropDown.Items.Add($Item)
    }

    $Form.Controls.Add($DropDown)

    $DropDownLabel = new-object System.Windows.Forms.Label
    $DropDownLabel.Location = new-object System.Drawing.Size(10,10) 
    $DropDownLabel.size = new-object System.Drawing.Size(100,40) 
    $DropDownLabel.Text = "Users current location:"
    $Form.Controls.Add($DropDownLabel)
    #
    #$Form.Controls.Add($DropDown1)

    $DropDownLabel1 = new-object System.Windows.Forms.Label
    $DropDownLabel1.Location = new-object System.Drawing.Size(35,80) 
    $DropDownLabel1.size = new-object System.Drawing.Size(300,400) 
    $DropDownLabel1.Text = "If USER location is UNKNOWN select 'HQCK'"
    $Form.Controls.Add($DropDownLabel1)
    #
    $Button = new-object System.Windows.Forms.Button
    $Button.Location = new-object System.Drawing.Size(100,50)
    $Button.Size = new-object System.Drawing.Size(100,20)
    $Button.Text = "Select an Item"
    $Button.Add_Click({Return-DropDown})
    $form.Controls.Add($Button)
    $form.ControlBox = $false

    $Form.Add_Shown({$Form.Activate()})
    [void] $Form.ShowDialog()
    
    return $script:choice
}

$Group = $null
$Group = SelectGroup
while ($Group -like ""){
    $Group = SelectGroup
}

$siteName =   $Group

$serverContainerDN = "CN=Servers,CN=" + $siteName + "," + $siteContainerDN
$siteservers = Get-ADObject -SearchBase $serverContainerDN -SearchScope OneLevel -filter { objectClass -eq "Server" } -Properties "DNSHostName", "Description" | Select Name, DNSHostName, Description
foreach ($sitedc in $siteservers) {
    # UNet
    if (($sitedc.name -like "*[DC NAME HINT]*") -and ($configNCDN -like "*[DOMAIN OF FQDN]") -and ($domainname -eq "[DOMAIN]")) {
    $serverinsite = $sitedc.name
    }
    # FBINet
    Elseif (($sitedc.name -like "*[DC NAME HINT]*") -and ($configNCDN -like "*D[DOMAIN OF FQDN]") -and ($domainname -eq "[DOMAIN]")) {
    $serverinsite = $sitedc.name
    } 
    }  

################################################################################################################################
# Pre-Process Exemption
################################################################################################################################
$pdc = (Get-ADDomainController -Discover -Service "PrimaryDC").name

$checkdc = Test-Connection $serverinsite -Quiet -Count 1
if ($checkdc -match "False") {
    $serv2use = $pdc
    write-host "Could not contact " $serverinsite
    write-host "Using $pdc"
    write-host "Please allow up to 90 minutes for this change to take effect due to replication."
    } else {
    $serv2use = $serverinsite
    write-host "Using Server: "$serv2use
    }

Import-Module activedirectory
if ($configNCDN -like "*[DOMAIN OF FQDN]") {
    $log_path = "[LOG PATH]"
    }
    Elseif ($configNCDN -like "*[DOMAIN OF FQDN") {
        $log_path = "[LOG PATH]"]
        } Else {
            $output = "Error:  A valid domain ($domainname) cannot be found.  A TEMPORARY MFA Exception cannot be processed at this time."
            write-host $output
            Exit
            }

do {
    [void][System.Reflection.Assembly]::LoadWithPartialName('Microsoft.VisualBasic') 
    $name = [Microsoft.VisualBasic.Interaction]::InputBox("Enter User logon name", "MULTI-FACTOR AUTHENTICATION (MFA) EXEMPTION", "Type STOP to exit") 
    if (($name -eq "STOP") -or ($name -eq "Type STOP to exit") -or  ($name -eq "")) {exit}
    try {$test = get-aduser $name -Properties samaccountname,displayname,distinguishedname} catch {[System.exception]"Error"}
} 
while ($test -like "")   
        
$testmembership = Get-ADPrincipalGroupMembership $name -Server $serv2use | where {$_.name -eq $temp_MFA_Ex_group}    
if ($testmembership) {
write-host -BackgroundColor White  -ForegroundColor DarkRed "User is already temporarily exempt from using multi-factor authentication. No actions required. Script will now exit."
pause
break
}
    
################################################################################################################################
# Set Date, Time and Time Zone
################################################################################################################################
<#
# Option to use local time zones for logging date/time information
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
    } Else {
    $timezoneET = [System.TimeZoneInfo]::FindSystemTimeZoneById("Eastern Standard Time").StandardName
    }
# Set Time Zone Abbreviations
$timezoneabrET = ($timezoneET -split " " |% { $_[0] }) -join ""
If ($timezoneabrET -eq "AST") {
    $timezoneabrET = "AKST"
    }
$DateStringET = "$timeET $timezoneabrET"

################################################################################################################################
# Implement Exemption
################################################################################################################################    
try {
Add-ADGroupMember $perm_MFA_Ex_group -Server $serv2use -Members $name -ErrorAction SilentlyContinue -Confirm:$false
set-aduser $name -Server $serv2use -replace @{FBIAttribute1="RSA_PERM"} -ErrorAction SilentlyContinue
set-aduser $name -Server $serv2use -replace @{FBIAttribute1Description="MFA Exempt"} -ErrorAction SilentlyContinue
}
Catch {
$er = $_.Exception.Message    
write-host $er
write-host "'$name' could not be exempted.  You may not have the required permissions to exempt user." -ForegroundColor yellow -BackgroundColor Red
pause
exit
}

$logpathout = $log_path + $logname
$username = $test.SamAccountName
$userdisplayname = $test.DisplayName
$userdn = $test.DistinguishedName
$admin = $env:USERNAME    
$output = "$userdisplayname" + ";" + "$username" + ";"  + "$userdn" + ";" + $admin + ";" + $serv2use + ";" + "$DateStringET"
$output | out-file $logpathout -Append

write-host "Added user (Username/sAMAccountName):" $username
write-host "Added user (DisplayName):" $userdisplayname
write-host "To group:" $perm_MFA_Ex_group
write-host -ForegroundColor Yellow "Confirming Exemption was applied..."
$test1 = Get-ADGroupMember -Identity $perm_MFA_Ex_group -Recursive -Server $serv2use | Select -ExpandProperty sAMAccountName
If ($test1 -contains $name) {
    write-host -ForegroundColor Green "Confirmed... User now has a permanent exemption from using multi-factor authentication."
    } Else {
    write-host -ForegroundColor Red "Unable to confirm that user now has a permanent exemption from using multi-factor authentication."
    }
    
pause