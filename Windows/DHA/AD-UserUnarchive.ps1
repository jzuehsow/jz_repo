




##############################################################################################################################################################


##############################################################################################################################################################

$version = "2.0";$errorpref = "SilentlyContinue";$adm = $env:username;$svr = $env:COMPUTERNAME;$date194 = (Get-Date).adddays(-194);$date = Get-Date -Format MM/dd/yy

$csv = "[INPUT PATH]\RED-Export.csv"
$log = "[LOGS PATH]\Unarchived Users"

##############################################################################################################################################################
#   Exchange Connections
##############################################################################################################################################################

<#$pass = Get-MsolUser -MaxResults 1
If(!$pass)
{
Write-Host "You must provide your credentials to connect to Office 365. Press Enter and supply them to the popup window." -F Green;Pause
    Do
    {
    $eid = (Get-ADUser $adm -Properties EmployeeNumber).EmployeeNumber
    $usrupn = (Get-ADUser -Filter {EmployeeID -eq $eid} | Where {$_.SamAccountName -notlike "[0-9]*"}).UserPrincipalName
    #$cred = Get-Credential -Credential $usrupn
    Connect-MsolService -ErrorAction $errorpref
    $pass = Get-MsolUser -MaxResults 1;If (!$pass){Write-Host "Failed to connect to o365. Press enter to try again." -F Red;Pause}
    }
    Until ($pass)
}


New_ExchangeSession
Clear-Host;$banner
#>


###################################################################################################################################################################
# Input                                       
###################################################################################################################################################################

Remove-Variable rm* -Force
Do
{
$rmentry = Read-Host "Enter the user's EmployeeID or SamAccountName"
$rmuser = $(try {get-aduser -filter {EmployeeID -eq $rmentry} -Properties EmployeeID,PasswordLastSet,Info,extensionAttribute6 | where {$_.SamAccountName -notlike "[0-9]*"}} catch {$null})
    If (!$rmuser){$rmuser = $(try {get-aduser $rmentry -Properties EmployeeID,EmployeeNumber,PasswordLastSet,Info} catch {$null})}
    If (!$rmuser){Write-Host "Invalid entry" -F Red}
    If ($rmuser.Count -gt 1){Write-Host "Multiple identities were found with EID $rmentry. Please resolve the conflict." -F Red;Pause;Exit}
    If ($rmuser.EmployeeNumber -like "?????????"){Write-Host "Account $rmentry appears to be an admin account. Manually enable and move the account." -F Red;Pause;Exit}
}
Until ($rmuser)
If ($rmuser.PasswordLastSet -lt $date194){$rmpwreset = $true}
$rmext6 = $rmuser.extensionAttribute6;$rmeid = ($rmuser.EmployeeID).ToUpper();$rmdn = $rmuser.DistinguishedName
$rminfo = $rmuser.Info;$rmenabled = $rmuser.Enabled;$rmuser = ($rmuser.SamAccountName).ToUpper();""

If ($rmdn -like "*SAR-Disabled*")
{
Write-Host "$rmuser is the the SAR-Disabled OU. Unarchiving this user requires a SAR." -F Red 
    Do{$rmsarcont = Read-Host "Do you wish to continue? Y/N"}Until($rmsarcont -eq "Y" -or $rmsarcont -eq "N");""
}

# Skip user loop
If ($rmenabled -eq $true -or $rmsarcont -eq "N")
{
    If ($rmenabled -eq $true){Write-Host "User account $rmuser with EID $rmeid is already enabled." -F Red;Pause;Clear-Host;$banner}
}
Else
{

If ($rmpwreset -eq $true)
{
    Do{Write-Host "The user's password has not been set in over 194 days and must be changed. Enter the desired password" -F Yellow -NoNewline ; $pswd = Read-Host " "
    $isGood = 0
    If (-Not($pswd -notmatch “[a-zA-Z0-9]”)){$isGood++};If ($pswd.Length -ge 12){$isGood++};If ($pswd -match “[0-9]”){$isGood++}
    If ($pswd -cmatch “[a-z]”){$isGood++};If ($pswd -cmatch “[A-Z]”){$isGood++};If ($pswd -notlike “*password*”){$isGood++}
    If ($isGood -ge 6){$pass = "Y"}Else{$pass = "N"}
    If ($pswd -like “*password*”){Write-Host "The password cannot contain the word password." -F Red}
    ElseIf ($pass -eq "N"){Write-Host "Password does not meet complexity requirment." -F Red}
    }Until ($pass -eq "Y")
    $pswd = convertTo-securestring -string $pswd -asplaintext -force
Set-ADAccountPassword $rmuser -Reset -NewPassword $pswd;""
}

##############################################################################################################################################################
# check and attributes
##############################################################################################################################################################

Write-Progress -Activity "Checking RED for account status......" -PercentComplete 33
$rmreduser = (Import-csv $csv | where {$_.EmployeeID -eq $rmeid -and $_.SamAccountName -notlike "[1-9]*"})
$rmreduser = $rmreduser | sort {$_.LastLogonDate -as [datetime]} -Descending | Select -First 1

$rmdisplayname = $rmreduser.DisplayName
$rmoffice = $rmreduser.Office
$rmtitle = $rmreduser.Title
$rmdescription =  $rmreduser.Description
$rmdepartment = $rmreduser.Department

    If ($rmdescription -like "*Archived*"){$rmdescription = $null}
    If ($rmdescription -like "*Disabled*"){$rmdescription = $null}
    If ($rmoffice){$rmoffice = $rmoffice.ToUpper()}
    If ($rmdisplayname)
    {
    $rmlower = ($rmdisplayname.Split("(")[0]).ToLower()
    $rmfixed = (Get-Culture).TextInfo.ToTitleCase($rmlower)
    $rmdisplayname = $rmdisplayname -Replace "$rmlower","$rmfixed"
    $rmdisplayname = $rmdisplayname -replace "ii","II" -replace "iii","III" -replace "iv","IV"
    }  
Write-Progress -Activity "Checking for account status......" -PercentComplete 66

##############################################################################################################################################################
# Locates OU
##############################################################################################################################################################

If ($rmreduser)
{
$rmdn = $rmreduser.DistinguishedName
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

    If($rmou)
    {
    $rmcanonical = (Get-ADOrganizationalUnit $rmou -Properties CanonicalName).CanonicalName
    Write-Host "The following is the suggested new OU and DisplayName." -F Green
    Write-Host "New DisplayName:  " -F Green -NoNewline;Write-Host $rmdisplayname -F Magenta
    Write-Host "New OU:  " -F Green -NoNewline;Write-Host $rmcanonical -F Magenta;""
        Do{$rmapprove = Read-Host "Do you approve the OU and DisplayName? Y/N"}Until($rmapprove -eq "Y" -or $rmapprove -eq "N")
            If ($rmapprove -eq "N"){$rmou = $null;$rmreduser = $null;""}
    }
    Else{$rmreduser = $null}
}
Write-Progress -Activity "Checking RED for account status......" -Completed
If (!$rmou)
{
    Do
    {
    $rmalldn = @()   
        Do
        {
        $rmounm = Read-Host "Enter the OU name where the user will be unarchived too."
            If ($rmounm -notlike "????" -and $rmounm -notlike "div*"){Write-Host "Invalid entry." -F Red}
            If ($rmounm -eq "HQHQ"){Write-Host "For HQ users, enter the division in the format DIV20, DIV13, ect." -F Red}
        }
        Until ($rmounm -ne "HQHQ" -and $rmounm -like "????" -or $rmounm -like "div*")
        $ous = (Get-ADOrganizationalUnit -Filter {Name -eq $rmounm}).DistinguishedName      
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
            $rmalldn = $rmalldn | Group-Object | Sort-Object Count
            $rmou = ($rmalldn | Select-Object -Last 1).Name
    If (!$(try {Get-ADUser -Filter * -SearchBase $dn -ResultSetSize 1} catch {$null})){$rmou = $null}
    }
    Until($rmou)
$rmcanonical = (Get-ADOrganizationalUnit $rmou -Properties CanonicalName).CanonicalName
}
Write-Progress -Activity "Unarchiving user $rmuser......" -PercentComplete 25

##############################################################################################################################################################
# IF  found and Else
##############################################################################################################################################################

If ($rmreduser)
{ 
    If ($rmoffice){Set-ADUser $rmuser -Office $rmoffice}
    If ($rmtitle){Set-ADUser $rmuser -Title $rmtitle}
    If ($rmdescription){Set-ADUser $rmuser -Description $rmdescription}Else{Set-ADUser $rmuser -Clear Description}
    If ($rmdepartment){Set-ADUser $rmuser -Department $rmdepartment}
}
Else
{
    $rmsample = Get-ADUser -Filter * -Properties DisplayName -ResultSetSize 100 -SearchBase $rmou
    $rmalldis = @()
    Foreach ($user in $rmsample){If ($user.DisplayName){$rmdiv = $user.DisplayName.Split("(")[1];If ($rmdiv){$rmdiv = $rmdiv.replace(") ","");$rmalldis += $rmdiv}}}
    $rmalldis = $rmalldis | Group-Object;$rmalldis = $rmalldis | Sort-Object Count;$rmalldis = $rmalldis | Select-Object -Last 1;$rmdiv = $rmalldis.name
    $rmolddiv = (((Get-ADUser $rmuser -Properties DisplayName).DisplayName).split("(")[1]).replace(")","").replace(" ","")
    If ($rmolddiv -and $rmdiv) {$rmdisplayname = ((Get-ADUser $rmuser -Properties DisplayName).DisplayName).replace("$rmolddiv","$rmdiv")}
    Set-ADUser $rmuser -Clear Description
    Set-ADUser $rmuser -Clear Department
    Set-ADUser $rmuser -Clear Office
    Set-ADUser $rmuser -Clear Title
    $rmerror = "Manually update the user's Description, Department, Office, and Title in Active Directory."
}

##############################################################################################################################################################
# Shared actions
##############################################################################################################################################################

Write-Progress -Activity "Unarchiving user $rmuser......" -PercentComplete 75
Set-RemoteMailbox $rmuser -HiddenFromAddressListsEnabled $false -WarningAction $errorpref -ErrorAction $errorpref > $null
$rmtest1 = Get-MsolUser -UserPrincipalName "$rmuser@GREEN.GOV" -ReturnDeletedUsers
$rmtest2 = Get-MsolUser -UserPrincipalName "$rmuser@GREEN.GOV"
$rmtest3 = Get-MsolUser -HasErrorsOnly -SearchString "$rmuser@GREEN.GOV"
If (!$rmtest1 -and !$rmtest2 -or $rmtest3)
{
Disable-Mailbox -Identity $rmuser -Confirm:$false -DomainController $pdc
Disable-RemoteMailbox -Identity $rmuser -Confirm:$false -DomainController $pdc
Enable-RemoteMailbox -Identity $rmuser -RemoteRoutingAddress "$rmuser@O365GREEN.mail.onmicrosoft.com" -DomainController $pdc > $null
$rmmbcreated = $true
}
Else {$rmmbcreated = $false}
    
If (!$rmext6){$rmext6 = "365GS,365EN"}
If ($rmext6 -notlike "*365GS*"){$rmext6 = $rmext6 + ",365GS"}
If ($rmext6 -notlike "*365EN*"){$rmext6 = $rmext6 + ",365EN"}
$rmext6 = $rmext6 -replace " ",""
Set-ADUser $rmuser -replace @{"extensionAttribute6"=$rmext6} 

Enable-ADAccount -Identity $rmuser;Get-ADUser $rmuser | Move-ADObject -TargetPath $rmou
If($rmdisplayname){Set-ADUser $rmuser -DisplayName $rmdisplayname}

$rminfo = "Unarchived $date - $adm (Script v.$version)
$rminfo";If ($rminfo.Length -gt "1020"){$rminfo = $rminfo.Substring(0,1020)}
Set-ADUser $rmuser -Replace  @{info=$rminfo}

$hash =[pscustomobject]@{Administrator = $adm;SamAccountName = $rmuser;EmployeeID = $rmeid;NewOU = $rmou;NewMailbox = $rmmbcreated}
$hash | export-csv "$log\$rmuser.csv" -NoTypeInformation -Append

Write-Progress -Activity "Unarchiving user $rmuser......" -Complete
"";Write-Host "Unarchive complete for $rmuser." -F Green
If($rmapprove -ne "Y")
{
Write-Host "New DisplayName:  " -F Green -NoNewline;Write-Host $rmdisplayname -F Magenta
Write-Host "New OU:  " -F Green -NoNewline;Write-Host $rmcanonical -F Magenta
}
Write-Host $rmerror -F Red;""

} # End skip user loop
# End do loop
    Do{$another = Read-Host "Would you like to unarchive another user? Y/N"}Until($another -eq "Y" -or $another -eq "N")
}
Until($another -eq "N")

"";"";""
Write-Host "----------------------------------------------------------------------------------------------------------------" -F Green
Write-Host "Complete........." -F Green
Write-Host "----------------------------------------------------------------------------------------------------------------" -F Green
Pause

##############################################################################################################################################################
# End                     
##############################################################################################################################################################