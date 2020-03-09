




##############################################################################################################################################################


##############################################################################################################################################################
$version = "2.0"

$banner = "
----------------------------------------------------------------------------------------------------------------------
----------------------------------------------------------------------------------------------------------------------                                                                                                                     

                                      Manual User Provisioning - Version $version
                                                                                                                                                                              
----------------------------------------------------------------------------------------------------------------------
----------------------------------------------------------------------------------------------------------------------




"

$footer = "----------------------------------------------------------------------------------------------------------------
User provisioning complete.........
----------------------------------------------------------------------------------------------------------------"

$pshost = get-host;$pswindow = $pshost.UI.RawUI;$newsize = $pswindow.BufferSize;$newsize.Height = 65;$newsize.Width = 120;$pswindow.BufferSize = $newsize
Clear-Host;$banner

$pdc = Get-ADDomain | Select-Object PDCEmulator
$pdc = $pdc.PDCEmulator
$PSDefaultParameterValues = @{"*-AD*:Server"="$pdc"}

$rmwid=[System.Security.Principal.WindowsIdentity]::GetCurrent()
$rmprp=new-object System.Security.Principal.WindowsPrincipal($rmwid)
$rmadm=[System.Security.Principal.WindowsBuiltInRole]::Administrator
$rmisadm = $rmprp.IsInRole($rmadm)

$rmadm = $env:username;$rmsvr = $env:COMPUTERNAME
$rmgptest = Get-ADPrincipalGroupMembership $rmadm | select name | where {$_.name -like "*Administrators_MDSU*"}

$log = "[LOG PATH]\ManualLogs.csv"
$date = Get-Date -Format MM/dd/yy
$failures = 0

If (!$rmgptest){Write-Host "Only members of  administrative groups are allowed to run this script." -F Red;Pause;Exit}

If ($rmisadm -eq $false){Write-Host "Powershell not running as administrator." -F Red;Pause;Exit}

$ErrorActionPreference = "SilentlyContinue"
$WarningPreference = "SilentlyContinue"

$csv = "[INPUT PATH]\Export.csv"
$rmdate = (get-date).adddays(-30)
$rmcsvtest = Get-Item $csv | select lastwritetime
$rmcsvtest = $rmcsvtest.lastwritetime

    If ($rmcsvtest -lt $rmdate){write-host "The CSV located at $csv is older than 30 days." -F Red}

###################################################################################################################################################################
#   New Data Input                                          
###################################################################################################################################################################

Do
{
$rmeid = Read-Host "Enter the user employeeID"
    If ($rmeid -notlike "?????????") {Write-Host "Invalid EID" -F Red}
}
Until ($rmeid -like "?????????")
$rmeid = $rmeid.ToUpper()

$rmtest = $(try {get-aduser -filter {EmployeeID -eq $rmeid} | where {$_.SamAccountName -notlike "[0-9]*"}} catch {$null})
$rmtest = $rmtest | sort LastLogonDate -Descending | Select -First 1
If($rmtest)
{
$sam = $rmtest.SamAccountName
    If ($rmtest.Enabled -eq $false){Write-Host "Account $sam exists with EID $rmeid. Run the unarchive script." -F Red;Pause;Exit}
    Else{Write-Host "Account $sam exists with EID $rmeid and is enabled." -F Red;Pause;Exit}
}
Else
{
"";Write-Host "No account found on UNET or FBINET. Manually enter the user's information to create a new account." -F Yellow;""
}

Write-Progress -Activity "Checking if account exists on []. Please wait......" -PercentComplete 50
$REDest = (Import-csv $csv | where {$_.EmployeeID -eq $rmeid -and $_.SamAccountName -notlike "[1-9]*"})
$REDest = $REDest | sort {$_.LastLogonDate -as [datetime]} -Descending | Select -First 1
Write-Progress -Completed " "

If ($REDest)
{
$rmuser = ($REDest.SamAccountName).ToLower()
$rmSurname = $REDest.Surname
$rmGivenName = $REDest.GivenName
$rmInitials = $REDest.middleName
$rmdisplayname = $REDest.DisplayName
$rmoffice = $REDest.Office
$rmtitle = $REDest.Title
$rmeid = $REDest.EmployeeID
$rmdn = $REDest.DistinguishedName
"";Write-Host "An account was found on FBINET matching the Employee ID entered ($rmdisplayname)." -F Yellow;""
}
Else
{
"";Write-Host "Employee Types" -F Gree;""
Write-Host "1. Agent"
Write-Host "2. Support"
Write-Host "3. Wage"
Write-Host "4. Contractor"
Write-Host "5. Detailee"
Write-Host "6. Foreign National"
Write-Host "7. Task Force Officer"
Write-Host "8. Intern"
Write-Host "9. Non-Employee"
Write-Host "10. High Value Interrogation Group"
""
Do
{
$rmtype = Read-Host "Enter selection for employee type"
    If ($rmtype -notlike "[1-9]" -and $rmtype -ne 10) {Write-Host "Invalid Selection." -F Red}
}
Until ($rmtype -like "[1-9]" -or $rmtype -eq 10)

If ($rmtype -eq 1) {$rmtype = "FBI"}
If ($rmtype -eq 2) {$rmtype = "FBI"}
If ($rmtype -eq 3) {$rmtype = "FBI"}
If ($rmtype -eq 4) {$rmtype = "CON"}
If ($rmtype -eq 5) {$rmtype = "OGA"}
If ($rmtype -eq 6) {$rmtype = "OGA"}
If ($rmtype -eq 7) {$rmtype = "TFO"}
If ($rmtype -eq 8) {$rmtype = "INT"}
If ($rmtype -eq 9) {$rmtype = "OGA"}
If ($rmtype -eq 10) {$rmtype = "HIG"}

""
Do
{
$rmSurname = Read-Host "Enter the users last name"
    If (!($rmSurname)) {Write-Host "Last name is required." -F Red}
}
Until ($rmSurname)
""
Do
{
$rmGivenName = Read-Host "Enter the users first name"
    If (!($rmGivenName)) {Write-Host "First name is required." -F Red}
}
Until ($rmGivenName)
""
$rmInitials = Read-Host "Enter the users middle initial, middle name, or press enter to skip"
""
$rmsuffix = Read-Host "If the users name has a suffix, enter it now, or press enter to skip"
""
$rmoffice = Read-Host "Enter the Division/Field Office from the EPAS request"
""
Write-Host "Enter the OU name where the account is being transferred too." -F Green
Write-Host "This will be the site code or division. Example: LAHQ, DLHQ, Div20, Div00, ect."  -F Green
""
    Do
    {
    $rmdn = Read-Host "Enter the OU name"
        If ($rmdn -notlike "????" -and $rmdn -notlike "div*")
        {
        Write-Host "Invalid entry." -F Red
        }
        If ($rmdn -eq "HQHQ")
        {
        Write-Host "For HQHQ users, enter the division in the format DIV20, DIV13, ect." -F Red
        }
    }
    Until ($rmdn -ne "HQHQ" -and $rmdn -like "????" -or $rmdn -like "div*")
}

If (!$rmtest -or $rmtest.Enabled -eq $false)
{
Write-Host "Enter the desired password for the account." -F Green
Write-Host "This is the password that will need entered into EPAS when closing the ticket." -F Green
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
}

##############################################################################################################################################################
# Connection to an Exchange server 
##############################################################################################################################################################

NEW_ExchangeSession

##############################################################################################################################################################
# Locates OU
##############################################################################################################################################################

Write-Progress -Activity "Provisioning user $rmuser......" -PercentComplete 1
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
            $rmus = Get-ADUser -Filter * -SearchBase $ou | Where {$_.DistinguishedName -like "*Endusers*" -or $_.DistinguishedName -like "*OCONUS*"}
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
Write-Progress -Activity "Provisioning user $rmuser......" -PercentComplete 5

###################################################################################################################################################################
# Displayname Determination
###################################################################################################################################################################

If ((!$FBINETtest) -and $rmou -ne "[USERS CONTAINER]")
{
$rmsample = Get-ADUser -Filter * -Properties DisplayName -ResultSetSize 100 -SearchBase $rmou

    $rmalldis = @()
    Foreach ($user in $rmsample)
    {
        If ($user.DisplayName)
        {
        $rmdiv = $user.DisplayName.Split("(")[1]
            If ($rmdiv)
            {
            $rmdiv = $rmdiv.replace(") ","")
            $rmalldis += $rmdiv
            }
        }
    }

$rmalldis = $rmalldis | Group-Object
$rmalldis = $rmalldis | Sort-Object Count
$rmalldis = $rmalldis | Select-Object -Last 1
$rmdiv = $rmalldis.name
$rmDisplayName = "$rmSurname, $rmGivenName $rmInitials $rmsuffix ($rmdiv) ($rmtype)" 
$rmDisplayName = $rmDisplayName.Replace("   "," ").Replace("  "," ")
}
ElseIf (!$rmDisplayName)
{
$rmDisplayName = "$rmSurname, $rmGivenName $rmInitials $rmsuffix () ($rmtype)"
$rmDisplayName = $rmDisplayName.Replace("   "," ").Replace("  "," ") 
}

###################################################################################################################################################################
# Converts to proper case
###################################################################################################################################################################

If ($rmSurname){$rmSurname = $rmSurname.ToLower();$rmSurname = (Get-Culture).TextInfo.ToTitleCase($rmSurname)}
If ($rmGivenName){$rmGivenName = $rmGivenName.ToLower();$rmGivenName = (Get-Culture).TextInfo.ToTitleCase($rmGivenName)}
If ($rmInitials){$rmInitials = $rmInitials.ToUpper();$rmInitials = $rmInitials.Substring(0,1)}
If ($rmoffice){$rmoffice = $rmoffice.ToUpper()}

If ($rmdisplayname)
{
$rmlower = ($rmdisplayname.Split("(")[0]).ToLower()
$rmfixed = (Get-Culture).TextInfo.ToTitleCase($rmlower)
$rmdisplayname = $rmdisplayname -Replace "$rmlower","$rmfixed"
$rmdisplayname = $rmdisplayname -replace "ii","II" -replace "iii","III" -replace "iv","IV"
}
$rmname = $rmdisplayname.Split("(")[0];$rmname = $rmname.Substring(0,($rmname.Length - 1))

##############################################################################################################################################################
# Existing Account Check and Un Archive
##############################################################################################################################################################

If ($rmtest)
{
    If ($rmtest.Enabled -eq $false -and $rmtest.SamAccountName -eq $rmuser)
    {
        $rmtest1 = Get-Remotemailbox $rmuser
        $rmtest2 = Get-Mailbox $rmuser            
        If ($rmtest1){Set-Remotemailbox $rmuser -HiddenFromAddressListsEnabled $false -WarningAction SilentlyContinue}
        ElseIf ($rmtest2){Set-Mailbox $rmuser -HiddenFromAddressListsEnabled $false -WarningAction SilentlyContinue;$rmout = "Mailbox not migrated to o365"}
        Else {$rmout = "No mailbox"}
                
    Enable-ADAccount -Identity $rmuser
    Get-ADUser $rmuser | Move-ADObject -TargetPath $rmou 
    Set-ADAccountPassword $rmuser -Reset -NewPassword $pswd
    Set-ADUser $rmuser -DisplayName $rmdisplayname -Description $null
    Set-ADUser $rmuser -ChangePasswordAtLogon $true       
        If ($rmoffice){Set-ADUser $rmuser -Office $rmoffice}
        If ($rmtitle){Set-ADUser $rmuser -Title $rmtitle}

        $rmext6 = (Get-ADUser $rmuser -Properties extensionAttribute6).extensionAttribute6
        If (!$rmext6){$rmext6 = "365GS,365EN"}
        If ($rmext6 -notlike "*365GS*"){$rmext6 = $rmext6 + ",365GS"}
        If ($rmext6 -notlike "*365EN*"){$rmext6 = $rmext6 + ",365EN"}
        $rmext6 = $rmext6 -replace " ",""
        Set-ADUser $rmuser -replace @{"extensionAttribute6"=$rmext6}       
            
        $test = (Get-ADUser $rmuser -Properties Enabled).Enabled ; If ($test -eq $false){$rmout = "Failed"}    
        If (!$rmout){$rmout = "None"}
        $action = "Unarchived"
    
        If ($rmout -eq "None") {Write-Host "Un-archived. Errors: $rmout." -F Green}
        Else {Write-Host "Un-archived. Errors: $rmout." -F Red}
    }
    ElseIf ($rmtest.SamAccountName -ne $rmuser)    
    {
    Write-Host "SamAccountName mismatch. Perform name change." -F Red
    Remove-Variable rm* -Force    ;"";"";""
    Write-Host $footer -F Green ; Pause ; Exit
    }
    Else 
    {
    Set-ADUser $rmuser -DisplayName $rmdisplayname -Description $null      
    If ($rmoffice){Set-ADUser $rmuser -Office $rmoffice}Else{Set-ADUser $rmuser -Office $null}
    If ($rmtitle){Set-ADUser $rmuser -Title $rmtitle}Else{Set-ADUser $rmuser -Clear Title}
    If ($rmou -ne "[USERS CONTAINER]"){Get-ADUser $rmuser | Move-ADObject -TargetPath $rmou}    
    $action = "Updated attributes"
    $rmout = "Account exists"        
    }
    
$hash =[pscustomobject]@{ 
SamAccountName = $rmuser
EmployeeID = $rmeid
Action = $action
Errors = $rmout}
$hash | export-csv $log -NoTypeInformation -Append
$hash = @{}
Write-Progress -Completed " "
Remove-Variable rm* -Force    ;"";"";""
Write-Host $footer -F Green ; Pause ; Exit  
}

###################################################################################################################################################################
#   Creates Variable for New User Name                                         
###################################################################################################################################################################

If (!$FBINETtest)
{
$i = $null
$rmfirstnameletter = $rmGivenName.Substring(0,1)
If ($rmInitials){$rmmiddlenameletter = $rmInitials.Substring(0,1)}
$rmuser = "$rmfirstnameletter$rmmiddlenameletter$rmSurname"
$rmuser = $rmuser.replace(" ","")

Write-Progress -Activity "Checking for available usernames. Please wait......" -PercentComplete 50
$FBINETcsv = (Import-csv $csv | where {$_.SamAccountName -like "$rmuser*"})
$rmusertry = $rmuser
Do
{
$rmunettest = $null
$rmfbinettest = $null
$rmuser = "$rmusertry$i"
$rmfbinettest = ($FBINETcsv | where {$_.SamAccountName -eq $rmuser -and $_.EmployeeID -ne $rmeid})
$rmunettest = $(try {get-aduser $rmuser} catch {$null})        
$i++
    # Number 1 is purposly skipped
    If ($i -eq 1) {$i = 2}
}
Until ($rmfbinettest -eq $null -and $rmunettest -eq $null)
$rmuser = $rmuser -replace " ",""
$rmuser = $rmuser.ToLower()
Write-Progress -Completed " "
}

##############################################################################################################################################################
# Test SamAccountName availability
##############################################################################################################################################################   

If ($(try {get-aduser $rmuser} catch {$null}))
{
Write-Host "SamAccountName already taken on UNET. Resolve conflict." -F Red ; Pause ; Exit
}

##############################################################################################################################################################
# Creates account
##############################################################################################################################################################
  
$rmparam = @{
'Path' = $rmou 
'UserPrincipalName' = "$rmuser@[DOMAIN]" 
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

New-ADUser $rmuser @rmparam

For ($a=5; $a -lt 25; $a++){Write-Progress -Activity "Provisioning user $rmuser......" -PercentComplete $a;Start-Sleep -Milliseconds 75}
    
If ($(try {get-aduser $rmuser} catch {$null}))
{
Set-ADUser $rmuser -Replace  @{extensionAttribute6="365GS,365EN"}
Set-ADUser $rmuser -Replace  @{info="Created $date. Script v$version"}
Get-aduser $rmuser | Rename-ADObject -NewName $rmname 
Enable-RemoteMailbox -Identity $rmuser -RemoteRoutingAddress "$rmuser@dojfbi.mail.onmicrosoft.com" -DomainController $pdc `
                     -ErrorAction SilentlyContinue -WarningAction SilentlyContinue > $null 
    $ii = 1
    Do
    {
        If ($ii -eq 1) 
        {
        For ($a=25; $a -lt 100; $a++){Write-Progress -Activity "Provisioning user $rmuser......" -PercentComplete $a;Start-Sleep -Milliseconds 75}
        Write-Progress -Activity "Provisioning user $rmuser......" -Complete
        }
        Else
        {
        For ($a=1; $a -lt 100; $a++){Write-Progress -Activity "Retrying account creation for $rmuser......" -PercentComplete $a;Start-Sleep -Milliseconds 100}
        Write-Progress -Activity "Retrying account creation for $rmuser......" -Complete
        }
    $ii++
    }
    Until(((Get-aduser $rmuser -Properties Mail).Mail) -or $ii -eq 5)

    If (!((Get-aduser $rmuser -Properties Mail).Mail))
    {           
    Write-Host "Failed to enable mailbox" -F Red
    $hash =[pscustomobject]@{ 
    SamAccountName = $rmuser
    EmployeeID = $rmeid
    Action = "Account Created"
    Errors = "Failed to enable mailbox"}
    $hash | export-csv $log -NoTypeInformation -Append
    $hash = @{}
    Remove-Variable rm* -Force    ;"";"";""
    Write-Host $footer -F Green ; Pause ; Exit
    }
} 
Else 
{
Write-Host "Failed to create AD object" -F Red
Remove-Variable rm* -Force    ;"";"";""
Write-Host $footer -F Green ; Pause ; Exit
}

If (!$rmout){$rmout = "None"}
Write-Host "Created account for $rmuser. Errors: $rmout" -F Green
$hash =[pscustomobject]@{ 
SamAccountName = $rmuser
EmployeeID = $rmeid
Action = "Account Created"
Errors = $rmout}
$hash | export-csv $log -NoTypeInformation -Append
$hash = @{}

If ($session){Remove-PSSession $session}
Remove-Variable rm* -Force    ;"";"";""
Write-Host $footer -F Green
Pause
##############################################################################################################################################################
# End                     
##############################################################################################################################################################

