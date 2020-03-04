




##############################################################################################################################################################
<# 

#>                         
##############################################################################################################################################################

$scriptvs = "2.0"
$banner = "
----------------------------------------------------------------------------------------------------------------------
----------------------------------------------------------------------------------------------------------------------                                                                                                                     

                                             Name Change
                                                                                                                                                                              
----------------------------------------------------------------------------------------------------------------------
----------------------------------------------------------------------------------------------------------------------




"
$pshost = get-host;$pswindow = $pshost.UI.RawUI;$newsize = $pswindow.BufferSize;$newsize.Height = 65;$newsize.Width = 120;$pswindow.BufferSize = $newsize
$rmwid=[System.Security.Principal.WindowsIdentity]::GetCurrent();$rmprp=new-object System.Security.Principal.WindowsPrincipal($rmwid)
$rmadm=[System.Security.Principal.WindowsBuiltInRole]::Administrator;$rmisadm = $rmprp.IsInRole($rmadm)

$rmadm = $env:username;$rmsvr = $env:COMPUTERNAME
$rmgptest = Get-ADPrincipalGroupMembership $rmadm | where {$_.name -like "*Administrators_MDSU*"}

Clear-Host;$banner
If (!$rmgptest){Write-Host "Only members of administrative groups are allowed to run this script." -F Red;Pause;Exit}
If ($rmisadm -eq $false){Write-Host "Powershell not running as administrator." -F Red;Pause;Exit}

$ErrorActionPreference = "SilentlyContinue"
$WarningPreference = "SilentlyContinue"

$log = "[LOG PATH]\Name Changes"

$date = Get-Date -Format MM/dd/yy
############################################################################################################################
###                                          Username Input & Validation                                                 ###
############################################################################################################################

Do
{
    Do
    {
    $rmolduser = Read-Host "Enter users current username"
        If (!($(try {Get-ADUser $rmolduser} catch {$null}))){Write-Host "Invalid username." -F Red}
    }
    Until ($(try {Get-ADUser $rmolduser} catch {$null}))

$rmeid = (get-aduser $rmolduser -Properties EmployeeID).EmployeeID

    If ($rmeid)
    {
    "";Write-Host "Selected users employee ID is $rmeid. Type Y and press enter to confirm this is the correct account" -F Yellow -NoNewline; $rmapproveeid = Read-Host " "
    }
}
Until ($rmapproveeid -eq "Y" -or !$rmeid)

############################################################################################################################
###                                                 Prerequist Questions                                                 ###
############################################################################################################################

Do
{
"";$rmREDaccount = Read-Host "Does the user have an account (Y/N)"
}
Until ($rmREDaccount -eq "Y" -or $rmREDaccount -eq "N")

If ($rmREDaccount -eq "Y")
{
""    
    Do
    {
    $rmfbinetchanged = Read-Host "Has the user's name been changed on (Y/N)"
    }
    Until ($rmREDchanged -eq "Y" -or $rmREDchanged -eq "N")
        If ($rmREDchanged -eq "N"){"";Write-Host "The user's name must be changed on before changing ." -F Red;Pause;Exit}
}

If ($rmREDaccount -eq "Y")
{
"";$rmnewuser = Read-Host "Enter users FBINET username";$rmnewuser = $rmnewuser.toupper();""
$rmmanualtest = $(try {get-aduser $rmnewuser} catch {$null})    
    If ($rmmanualtest -and $rmnewuser -ne $rmolduser){Write-Host "Username already in use on FBINET. Resolve naming conflict...." -F Red;Pause;Exit}
}


############################################################################################################################
###                                                 New Data Input                                                       ###
############################################################################################################################

"";Write-Host "You will now be prompted for the user’s new name and SAR number for the name change." -F Yellow
"";$rmSurname = Read-Host "Enter the users last name"
"";$rmGivenName = Read-Host "Enter the users first name"
"";$rmInitials = Read-Host "Enter the users middle initial, middle name, or press enter to skip"
"";$rmsuffix = Read-Host "If the users name has a suffix, enter it now, or press enter to skip"
"";$rmticket = Read-Host "Enter the SAR number for the name change. Name changes require a SAR"

If ($rmSurname)
{
$rmSurname = $rmSurname.tolower()
$tmp = $rmSurname.substring(0,1).toupper()
$rmSurname = $tmp + $rmSurname.substring(1,$rmSurname.length - 1)
}

If ($rmGivenName)
{
$rmGivenName = $rmGivenName.tolower()
$tmp = $rmGivenName.substring(0,1).toupper()
$rmGivenName = $tmp + $rmGivenName.substring(1,$rmGivenName.length - 1)
}

If ($rmInitials)
{
    If ($rmInitials.Length -gt 1)
    {
    $rmInitials = $rmInitials.tolower()
    $tmp = $rmInitials.substring(0,1).toupper()
    $rmInitials = $tmp + $rmInitials.substring(1,$rmInitials.length - 1)
    }
    Else
    {
    $rmInitials = $rmInitials.toupper()
    }

    If ($rmInitials -like "?"){$rmInitials = "$rmInitials."}
}

If ($rmsuffix)
{
$rmsuffix = $rmsuffix.tolower()
$tmp = $rmsuffix.substring(0,1).toupper()
$rmsuffix = $tmp + $rmsuffix.substring(1,$rmsuffix.length - 1)
    If ($rmsuffix -like "JR" -or $rmsuffix -like "SR"){$rmsuffix = "$rmsuffix."}
}

If ($rmticket){$rmticket = $rmticket.toupper()}
If ($rmInitials){$rmmiddlenameletter = $rmInitials.Substring(0,1)}

############################################################################################################################
###                                           Creates Primary Variables                                                 ###
############################################################################################################################

## Old account attributes ##
$rmattrib = get-aduser $rmolduser -Properties SamAccountName,SID,distinguishedname,displayname,Surname,GivenName,Initials,EmailAddress,EmployeeID,Info
$rmoldSamAccountName = ($rmattrib.SamAccountName).toupper()
$rmolddisplayname = $rmattrib.displayname
If ($rmattrib.EmailAddress){$rmoldEmail = $rmattrib.EmailAddress}
If ($rmattrib.Surname){$rmoldSurname = $rmattrib.Surname}
If ($rmattrib.GivenName){$rmoldGivenName = $rmattrib.GivenName}
If ($rmattrib.Initials){$rmoldInitials = $rmattrib.Initials}
If ($rmattrib.EmployeeID){$rmeid = $rmattrib.EmployeeID}
$rmSID = $rmattrib.SID
$rminfo = $rmattrib.Info

## Creates display name ##
If ($rmolddisplayname)
{
$rmdiv = "(" + $rmolddisplayname.Split("(")[1] + "(" + $rmolddisplayname.Split("(")[2]
If ($rmdiv -like "(("){$rmdiv = $null}
$rmDisplayName = "$rmSurname, $rmGivenName $rmInitials $rmsuffix $rmdiv" 
$rmDisplayName = $rmDisplayName.Replace("   "," ").Replace("  "," ")
}

$rmname = $rmdisplayname.Split("(")[0];$rmname = $rmname.Substring(0,($rmname.Length - 1))

############################################################################################################################
###                                           Creates Variable for New User Name                                         ###
############################################################################################################################

If ($rmfbinetaccount -eq "N")
{

$rmfirstnameletter = $rmGivenName.Substring(0,1)
$rmnewuser = "$rmfirstnameletter$rmmiddlenameletter$rmSurname"
$rmnewuser = $rmnewuser.replace(" ","")

Write-Progress -Activity "Checking for available usernames. Please wait......" -PercentComplete 50
$FBINETcsv = (Import-csv $csv | where {$_.SamAccountName -like "$rmnewuser*"})

$rmnewusertry = $rmnewuser

    Do
    {

    $rmunettest = $null
    $rmfbinettest = $null
    $rmnewuser = "$rmnewusertry$rmnumber"
    $rmfbinettest = ($FBINETcsv | where {$_.SamAccountName -eq "$rmnewuser"})
    $rmunettest = $(try {get-aduser $rmnewuser} catch {$null})
        
        # Number 1 is purposly skipped
        If (!($rmnumber)) {$rmnumber = 1}
        $rmnumber++
    }
    Until ($rmfbinettest -eq $null -and $rmunettest -eq $null)

Write-Progress -Activity "Checking for available usernames. Please wait......" -Completed

"";""

## Displays the available username and prompts for acceptance ##

$rmnewuser = $rmnewuser -replace " ",""

Do 
{
Write-Host "The recommended new username is: " -F Yellow -NoNewline; Write-Host "$rmnewuser" -F magenta
write-host "Type Y and press enter to accept this username " -F Yellow
write-host "Type N and press enter to manually enter one" -F Yellow -NoNewline; $rmacceptusername = Read-Host " "
"";""
}
Until ($rmacceptusername -eq "Y" -or $rmacceptusername -eq "N")

## Manual username entry and Verification ##
    If ($rmacceptusername -eq "N")
    {

    $rmnewuser = Read-Host "Enter new username"
    $rmnewuser = $rmnewuser.toupper()
    ""
    $rmmanualtest = $(try {get-aduser $rmnewuser} catch {$null})    
        If ($rmmanualtest -and $rmnewuser -ne $rmolduser){Write-Host "Username already in use on . Resolve naming conflict...." -F Red;Pause;Exit}
    }
}

############################################################################################################################
###                                        VarIfies Rights to Rename Before Continuing                                   ###
############################################################################################################################

Set-ADUser -Identity $rmSID -SamAccountName "$rmnewuser"
Set-ADUser -Identity $rmSID -UserPrincipalName "$rmnewuser@[]"

for ($a=1; $a -lt 100; $a++) 
{
Write-Progress -Activity "VerIfying administrative rights....." -PercentComplete $a 
Start-Sleep -Milliseconds 100
}
Write-Progress -Completed " "
$rmchangepass = $(try {get-aduser $rmnewuser} catch {$null})

    If (!($rmchangepass))
    {
    Set-ADUser -Identity $rmSID -SamAccountName "$rmolduser"
    Set-ADUser -Identity $rmSID -UserPrincipalName "$rmolduser@[]"
    Write-Host "**** Name change failed. You do not have appropriate permissions ****" -F Red;Pause;Exit
    }

###################################################################################################################################################################
# Creates connection to an Exchange server 
###################################################################################################################################################################

$exsvrs = (Get-ADComputer -Filter {Name -like "*-UO365-*"}).Name
Foreach ($exsvr in $exsvrs)
{
    If (Test-Connection $exsvr -Count 2)
    {
    $session = New-PSSession -ConfigurationName Microsoft.Exchange -ConnectionUri http://$exsvr.[DOMAIN]/Powershell/
    Import-PSSession $session -DisableNameChecking -AllowClobber -Verbose:$false -ErrorAction Stop | Out-Null        
        If (Get-Command Get-Mailbox){Break}
    }
}
If (!(Get-Command Get-Mailbox)){Write-Host "Connection to exchange failed. Please try again." -F Red;Pause;Exit}

############################################################################################################################
###                                                    Rename Action                                                     ###
############################################################################################################################

$rmemailsuffix = $rmoldEmail.Split("@")[1]

$rmtelephonetab = "Ticket#: $rmticket
Old Username: $rmoldSamAccountName
New Username: $rmnewuser
Changed by: $rmadm - $date
Name Change Script v.$scriptvs

*******************************************
$rminfo"

If ($rmtelephonetab.Length -gt "1020")
{
$rmtelephonetab = $rmtelephonetab.Substring(0,1020)
}

Rename-ADObject -identity (Get-ADUser -Identity $rmSID).distinguishedname -newname $rmnewuser
Set-ADUser -Identity $rmSID -DisplayName $rmDisplayName

If ($rmGivenName){Set-ADUser -Identity $rmSID -GivenName $rmGivenName}
If ($rmSurname){Set-ADUser -Identity $rmSID -Surname $rmSurname}

If ($rmInitials)
{
Set-ADUser -Identity $rmSID -Initials $rmmiddlenameletter
Set-ADUser -Identity $rmSID -Replace @{"middleName" = $rmmiddlenameletter}
}
Else
{
Set-ADUser -Identity $rmSID -Clear Initials
Set-ADUser -Identity $rmSID -Clear MiddleName
}

Set-ADUser -Identity $rmSID -Replace  @{info=$rmtelephonetab}
Set-ADUser -Identity $rmSID -replace @{mailNickname = $rmnewuser}
Get-aduser -Identity $rmSID | Rename-ADObject -NewName $rmname
Set-ADUser -Identity $rmSID -Replace @{TargetAddress="$rmnewuser@[EXTERNAL DOMAIN]"}


############################################################################################################################
###                                                      Email Address                                                   ###
############################################################################################################################

$rmnewemail = "$rmnewuser@[DOMAIN]";$rmnewemail = $rmnewemail.ToLower();$rmnewemail = $rmnewemail -replace " ",""

Set-Mailbox $rmolduser -alias $rmnewuser

    For ($a=1; $a -lt 100; $a++) 
    {
    Write-Progress -Activity "Updating Exchange Alias....." -PercentComplete $a ; Start-Sleep -Milliseconds 100
    }
    Write-Progress -Activity "Updating Exchange Alias....." -Completed

$rmmailboxtest = Get-RemoteMailbox $rmnewuser

############################################################################################################################
###                                                         Proxy                                                        ###
############################################################################################################################

$rmproxies = Get-ADUser -Identity $rmSID -properties proxyAddresses

Foreach ($item in $rmproxies.proxyaddresses)
{
    If ($item -cmatch "SMTP")
    {
    $lower = $item -replace "SMTP","smtp"
    Set-ADUser -Identity $rmSID -remove @{proxyAddresses = $item}
    Set-ADUser -Identity $rmSID -add @{proxyAddresses = $lower}
    }
    ElseIf ($item -eq "smtp:$rmnewemail")
    {
    Set-ADUser -Identity $rmSID -remove @{proxyAddresses = $item}
    }
    ElseIf ($item -like "*[EXTERNAL DOMAIN]")
    {
    Set-ADUser -Identity $rmSID -remove @{proxyAddresses = $item}
    Set-ADUser -Identity $rmSID -add @{proxyAddresses = "smtp:$rmnewuser@[EXTERNAL DOMAIN]"}
    }
}
Set-ADUser -Identity $rmSID -add @{proxyAddresses = "SMTP:$rmnewuser@[DOMAIN]"}
Set-ADUser -Identity $rmSID -EmailAddress $rmnewemail


############################################################################################################################
###                                               PIV Team NotIfication Email                                            ###
############################################################################################################################

If ($rmnewuser -ne $rmoldSamAccountName)
{

    $rmadmineid = get-aduser $rmadm -properties EmployeeNumber,EmployeeID

    If ($rmadmineid.EmployeeNumber -like "?????????"){$rmadmineid = $rmadmineid.EmployeeNumber}
    ElseIf ($rmadmineid.EmployeeID -like "?????????"){$rmadmineid = $rmadmineid.EmployeeID}

        If ($rmadmineid -like "?????????")
        {
        $rmuseraccount = $(try {get-aduser -filter {EmployeeID -eq $rmadmineid} | where {$_.SamAccountName -notlike "*-*"}} catch {$null})
        $rmuseraccount = $rmuseraccount.SamAccountName
        }

            If (!($rmuseraccount))
            {
                Do
                {
                $rmuseraccount = Read-Host "Enter the username for your regular account, where the email will be sent from"
                $rmuseraccounttry = $(try {get-aduser $rmuseraccount} catch {$null})
                    If (!$rmuseraccounttry) 
                    {
                    ""
                    Write-Host "Invalid username" -F Red
                    }
                }
                Until ($rmuseraccounttry)
            }

$rmfromemail = (Get-ADUser $rmuseraccount -Properties EmailAddress).EmailAddress

$body = "



Old Name:   $rmolddisplayname
Old Username:   $rmoldSamAccountName

New Name:   $rmDisplayName  
New Username:   $rmnewuser


















"
Send-MailMessage -From $rmfromemail -To "" -CC "" -Subject "Name Change -- $rmticket" -Body $body -SmtpServer Smtp.fbi.gov

}

############################################################################################################################
###                                                 VerIfication & NotIfication                                         ###
############################################################################################################################

"";""

If (!$rmmailboxtest)
{
$rmerror1 = "Mailbox alias update failed."
"";Write-Host "**** $rmerror1 Manually update their alias on the Exchange server ****" -F Red;""
}

If ($rmerror -eq $null -and $rmerror1 -eq $null) {$rmerror = "None"}

"";Write-Host "Name change complete....." -F Green;""
Write-Host "Notify the user by RED email of the name change completion." -F Green
"";""

Write-Host "New username is: $rmnewuser
New email address is: $rmnewemail
New display name is: $rmDisplayName" -F magenta

"";""

############################################################################################################################
###                                                  Creates Log File                                                    ###
############################################################################################################################

$rmlogfile = "
*******************************************************************************
   NAME CHANGE     ::     Name change script: Version $scriptvs                                  
*******************************************************************************


Change completed:  $date

Administrator:  $rmadm

Errors:  $rmerror
         $rmerror1

*******************************************************************************





***** PREVIOUS NAME *****

Username:  $rmoldSamAccountName

Display Name:  $rmolddisplayname

First Name:  $rmoldGivenName

Last Name:  $rmoldSurname

Middle/Initials:  $rmoldInitials





***** NEW NAME *****

Username:  $rmnewuser

Display Name:  $rmDisplayName

First Name:  $rmGivenName

Last Name:  $rmSurname

Middle/Initials:  $rmInitials


*******************************************************************************

"
Out-File -filepath "$log\$rmoldSamAccountName-$rmnewuser.txt" -InputObject $rmlogfile

############################################################################################################################
### End
############################################################################################################################

Write-Host "----------------------------------------------------------------------------------------------------------------" -F Yellow
Write-Host "Name Change Complete........." -F Yellow
Write-Host "----------------------------------------------------------------------------------------------------------------" -F Yellow

If ($session){Remove-PSSession $session};Remove-Variable rm* -Force;Pause
