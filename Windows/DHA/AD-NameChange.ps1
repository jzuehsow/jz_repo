





##############################################################################################################################################################
<# 
Author - 
Purpose - Name Change.

Change Log:




#>                         
##############################################################################################################################################################
$version = "2.0"

#CALL COMMON FUNCTIONS HERE
Start_Script


##############################################################################################################################################################
#   Username Input & Validation                                           
##############################################################################################################################################################

Do
{
    Do
    {
    $rmolduser = Read-Host "Enter the user's current Username"
    $rmolduser = $rmolduser.toupper()
        If (!($(try {Get-ADUser $rmolduser} catch {$null}))){Write-Host "Invalid username." -F Red}
    }
    Until ($(try {Get-ADUser $rmolduser} catch {$null}))

$rmeid = (get-aduser $rmolduser -Properties EmployeeID).EmployeeID

    If ($rmeid){"";Write-Host "Selected users employee ID is $rmeid. Type Y and press enter to confirm this is the correct account" -F Yellow -NoNewline; $rmapproveeid = Read-Host " "}
    Else{$rmapproveeid = "Y"}
}
Until ($rmapproveeid -eq "Y")

##############################################################################################################################################################
#   Prerequist Questions
##############################################################################################################################################################

Do
{
""
$rmREDAccount = Read-Host "Does the user have an RED account (Y/N)"
}
Until ($rmREDAccount -eq "Y" -or $rmREDAccount -eq "N")

If ($rmREDAccount -eq "Y")
{
""    
    Do
    {
    $rmREDChanged = Read-Host "Has the user's name been changed on RED (Y/N)"
    }
    Until ($rmREDChanged -eq "Y" -or $rmREDChanged -eq "N")

        If ($rmREDChanged -eq "N"){"";Write-Host "The user's name must be changed on RED before changing GREEN." -F Red;Pause;Exit}
}

    If ($rmREDAccount -eq "Y")
    {
    "";$rmnewuser = Read-Host "Enter users RED username";$rmnewuser = $rmnewuser.toupper();""
    $rmmanualtest = $(try {get-aduser $rmnewuser} catch {$null})
    
        If ($rmmanualtest -and $rmnewuser -ne $rmolduser){Write-Host "Username already in use on RED. Resolve naming conflict...." -F Red;Pause;Exit}
    }

##############################################################################################################################################################
#   New Data Input
##############################################################################################################################################################

"";Write-Host "You will now be prompted for the user’s new name and SAR number for the name change." -F Yellow
"";$rmSurname = Read-Host "Enter the users last name"
"";$rmGivenName = Read-Host "Enter the users first name"
"";$rmInitials = Read-Host "Enter the users middle initial, middle name, or press enter to skip"
"";$rmsuffix = Read-Host "If the users name has a suffix, enter it now, or press enter to skip"
"";$rmticket = Read-Host "Enter the SAR number for the name change. Name changes require a SAR"

If ($rmSurname){$rmSurname = $rmSurname.ToLower();$rmSurname = (Get-Culture).TextInfo.ToTitleCase($rmSurname)}
If ($rmGivenName){$rmGivenName = $rmGivenName.ToLower();$rmGivenName = (Get-Culture).TextInfo.ToTitleCase($rmGivenName)}
If ($rmInitials){$rmInitials = $rmInitials.ToLower();$rmInitials = $rmInitials.Substring(0,1)}

If ($rmsuffix)
{
$rmsuffix = $rmsuffix.tolower();$rmsuffix = (Get-Culture).TextInfo.ToTitleCase($rmsuffix)
If ($rmsuffix -like "JR" -or $rmsuffix -like "SR"){$rmsuffix = "$rmsuffix."}
}

If ($rmticket){$rmticket = $rmticket.toupper()}
If ($rmInitials){$rmmnltr = $rmInitials.Substring(0,1)}

##############################################################################################################################################################
#   Creates Primary Variables                                  
##############################################################################################################################################################

## Old account attributes ##
$rmattrib = get-aduser $rmolduser -Properties SamAccountName,SID,distinguishedname,displayname,Surname,GivenName,Initials,EmailAddress,EmployeeID,Info
$rmoldsam = ($rmattrib.SamAccountName).toupper()
$rmolddis = $rmattrib.displayname
If ($rmattrib.EmailAddress){$rmoldEmail = $rmattrib.EmailAddress}
If ($rmattrib.Surname){$rmoldSurname = $rmattrib.Surname}
If ($rmattrib.GivenName){$rmoldGivenName = $rmattrib.GivenName}
If ($rmattrib.Initials){$rmoldInitials = $rmattrib.Initials}
If ($rmattrib.EmployeeID){$rmeid = $rmattrib.EmployeeID}
$rmSID = $rmattrib.SID
$rminfo = $rmattrib.Info

## Creates display name ##
If ($rmolddis){
$rmlower = ($rmolddis.Split("(")[0]).ToLower()
$rmfixed = (Get-Culture).TextInfo.ToTitleCase($rmlower)
$rmdisplayname = $rmolddis -Replace "$rmlower","$rmfixed"
$rmdisplayname = $rmdisplayname -replace "ii","II" -replace "iii","III" -replace "iv","IV"}

$rmname = $rmdisplayname.Split("(")[0];$rmname = $rmname.Substring(0,($rmname.Length - 1))

##############################################################################################################################################################
#   Creates Variable for New User Name            
##############################################################################################################################################################


If ($rmREDaccount -eq "N")
{
$rmfsltr = $rmGivenName.Substring(0,1)
$rmnewuser = "$rmfsltr$rmmnltr$rmSurname"
$rmnewuser = $rmnewuser.replace(" ","")

Write-Progress -Activity "Checking for available usernames. Please wait......" -PercentComplete 50
$REDcsv = (Import-csv $csv | where {$_.SamAccountName -like "$rmnewuser*"})

$rmnewusertry = $rmnewuser

    Do
    {
    $rmGREENTest = $null
    $rmREDTest = $null
    $rmnewuser = "$rmnewusertry$rmnumber"
    $rmREDTest = ($Redcsv | where {$_.SamAccountName -eq "$rmnewuser"})
    $rmGREENTest = $(try {get-aduser $rmnewuser} catch {$null})
        
        # Number 1 is purposly skipped
        If (!($rmnumber)) {$rmnumber = 1}
        $rmnumber++

    }
    Until ($rmREDTest -eq $null -and $rmGREENTest -eq $null)

$rmnewuser = $rmnewuser -replace " ",""
Write-Progress -Completed " ";";"

Do 
{
Write-Host "The recommended new username is: " -F Yellow -NoNewline; Write-Host "$rmnewuser" -F magenta
write-host "Type Y and press enter to accept this username " -F Yellow
write-host "Type N and press enter to manually enter one" -F Yellow -NoNewline; $rmacceptusername = Read-Host " "
";"
}
Until ($rmacceptusername -eq "Y" -or $rmacceptusername -eq "N")

## Manual username entry and Verification ##
    If ($rmacceptusername -eq "N")
    {

    $rmnewuser = Read-Host "Enter new username"
    $rmnewuser = $rmnewuser.toupper()
    ""
    $rmmanualtest = $(try {get-aduser $rmnewuser} catch {$null})
    
        If ($rmmanualtest -and $rmnewuser -ne $rmolduser)
        {
        Write-Host "Username already in use on GREEN. Resolve naming conflict...." -F Red;Pause;Exit
        }
    }
}

##############################################################################################################################################################
#   Varifies Rights to Rename Before Continuing 
##############################################################################################################################################################

Set-ADUser -Identity $rmSID -SamAccountName "$rmnewuser"
Set-ADUser -Identity $rmSID -UserPrincipalName "$rmnewuser@[DOMAIN]"

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
Set-ADUser -Identity $rmSID -UserPrincipalName "$rmolduser@[DOMAIN]"
Write-Host "**** Name change failed. You do not have appropriate permissions ****" -F Red
Exit;Pause
}

#####################################################################################################################################################################################################
#   Creates connection to an Exchange server 
#####################################################################################################################################################################################################

$exsvrs = (Get-ADComputer -Filter {Name -like "[EXCH SERVER HINT]-*"}).Name
Foreach ($exsvr in $exsvrs)
{
    If (Test-Connection $exsvr -Count 2){
    $session = New-PSSession -ConfigurationName Microsoft.Exchange -ConnectionUri http://$exsvr.[DOMAIN]]/Powershell/
    Import-PSSession $session -DisableNameChecking -AllowClobber -Verbose:$false -ErrorAction Stop | Out-Null
    Break}
}
If (Get-Command Set-RemoteMailbox){$test = Get-RemoteMailbox -Filter * -ResultSize 2 -ErrorAction SilentlyContinue -WarningAction SilentlyContinue}
If (!$test){Write-Host "Connection to exchange failed. Please try again." -F Red;Pause;Exit}

##############################################################################################################################################################
#   Rename Action 
##############################################################################################################################################################

$rmemailsuffix = $rmoldEmail.Split("@")[1]

$rmtelephonetab = "Ticket#: $rmticket
Old Username: $rmoldsam
New Username: $rmnewuser
Changed by: $rmadmin - $date
Name Change Script v.$version
*******************************************
$rminfo"

If ($rmtelephonetab.Length -gt "1020"){$rmtelephonetab = $rmtelephonetab.Substring(0,1020)}

Rename-ADObject -identity (get-aduser -Identity $rmSID).distinguishedname -newname $rmnewuser
Set-ADUser -Identity $rmSID -DisplayName "$rmDisplayName"
Set-ADUser -Identity $rmSID -Replace  @{info=$rmtelephonetab}
Get-ADUser -Identity $rmSID | Rename-ADObject -NewName $rmname

If ($rmGivenName){Set-ADUser -Identity $rmSID -GivenName $rmGivenName}
If ($rmSurname){Set-ADUser -Identity $rmSID -Surname $rmSurname}

If ($rmInitials)
{
Set-ADUser -Identity $rmSID -Initials $rmmnltr
Set-ADUser -Identity $rmSID -Replace @{"middleName" = $rmmnltr}
}
Else
{
Set-ADUser -Identity $rmSID -Clear Initials
Set-ADUser -Identity $rmSID -Clear MiddleName
}

##############################################################################################################################################################
#   Email Address                                    
##############################################################################################################################################################

$rmnewemail = "$rmnewuser@GREEN.GOV";$rmnewemail = $rmnewemail.ToLower();$rmnewemail = $rmnewemail -replace " ",""

$rmtest1 = Get-RemoteMailbox $rmolduser -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
If (!$rmtest1){$rmtest2 = Get-Mailbox $rmolduser -WarningAction SilentlyContinue -ErrorAction SilentlyContinue}  

If ($rmtest1) {Set-Remotemailbox $rmolduser -alias $rmnewuser -WarningAction SilentlyContinue -ErrorAction SilentlyContinue}
If ($rmtest2) {Set-Mailbox $rmolduser -alias $rmnewuser -WarningAction SilentlyContinue -ErrorAction SilentlyContinue}

    For ($a=1; $a -lt 100; $a++) 
    {
    Write-Progress -Activity "Updating Exchange Alias....." -PercentComplete $a 
    Start-Sleep -Milliseconds 100
    }
    Write-Progress -Completed " "

$rmmailboxtest = $null
If ($rmtest1) {$rmmailboxtest = Get-RemoteMailbox $rmnewuser -WarningAction SilentlyContinue -ErrorAction SilentlyContinue}
If ($rmtest2) {$rmmailboxtest = Get-Mailbox $rmnewuser -WarningAction SilentlyContinue -ErrorAction SilentlyContinue}

##############################################################################################################################################################
#   Proxy                        
##############################################################################################################################################################

$rmproxies = Get-ADUser -Identity $rmSID -properties proxyAddresses

Foreach ($item in $rmproxies.proxyaddresses)
{
    If ($item -cmatch "SMTP")
    {
    $lower = $item -replace "SMTP","smtp"
    Set-ADUser -Identity $rmSID -remove @{proxyAddresses = $item}
    Set-ADUser -Identity $rmSID -add @{proxyAddresses = $lower}
    }
    If ($item -eq "smtp:$rmnewemail")
    {
    Set-ADUser -Identity $rmSID -remove @{proxyAddresses = $item}
    }
}

Set-ADUser -Identity $rmSID -add @{proxyAddresses = "SMTP:$rmnewuser@[DOMAIN]"}
Set-ADUser -Identity $rmSID -EmailAddress $rmnewemail

##############################################################################################################################################################
#   VerIfication & NotIfication                        
##############################################################################################################################################################

"";""
If (!($rmmailboxtest))
{
$rmerror1 = "Mailbox alias update failed."
"";Write-Host "**** $rmerror1 Manually update their alias on the Exchange server ****" -F Red;""
}

If ($rmerror -eq $null -and $rmerror1 -eq $null) {$rmerror = "None"}
"";Write-Host "Name change complete....." -F Green;""
Write-Host "Notify the user by RED email of the name change completion." -F Green
";"

Write-Host "New username is: $rmnewuser
New email address is: $rmnewemail
New display name is: $rmDisplayName" -F magenta

";"

##############################################################################################################################################################
#   Creates Log File                                       
##############################################################################################################################################################

$rmlogfile = "
*******************************************************************************
   NAME CHANGE     ::     GREEN - Name change script: Version $version                                  
*******************************************************************************


Change completed:  $date

Administrator:  $rmadmin

Errors:  $rmerror
         $rmerror1

*******************************************************************************





***** PREVIOUS NAME *****

Username:  $rmoldsam

Display Name:  $rmolddis

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
Out-File -filepath "$log\$rmoldsam-$rmnewuser.txt" -InputObject $rmlogfile

Write-Host "----------------------------------------------------------------------------------------------------------------" -F Yellow
Write-Host "Name Change Complete........." -F Yellow
Write-Host "----------------------------------------------------------------------------------------------------------------" -F Yellow

##############################################################################################################################################################
#    End
##############################################################################################################################################################

If ($session){Remove-PSSession $session}
Remove-Variable rm* -Force
"";Pause
