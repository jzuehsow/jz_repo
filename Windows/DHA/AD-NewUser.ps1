




$PSDefaultParameterValues = @{"*-AD*:Server"="$pdc"}


$date = Get-Date -Format MM/dd/yy
$failures = 0
$inputPath

##############################################################################################################################################################
#   Console Input
##############################################################################################################################################################

$i = 1
Remove-Variable var* 

$items = (Get-ChildItem -Path $inputPath -Include *.txt, *.csv).Name
Write-host "Input files must be saved to $inputPath" -F Yellow    ;"";""
    If (!$items){Write-Host "There are no available input files." -F Red;"";Pause;Exit}
Write-host "Available Input Files:" -F Yellow;""

Foreach ($item in $items){New-Variable -Name "var$i" -Value $item -Force;write-host "$i. $item" -F Green;$i++}    ;""

Do{
$rmnm = Read-Host "Enter line number of input file and press enter"    
$rmsel = Get-Variable -Name "var$rmnm" -ValueOnly
    If (!$rmsel){Write-Host "No input file found that coresponds to line number $rmnm" -F Red;Pause}
}Until ($rmsel)    ;"";""

$input = "$inputPath\$rmsel"
$log = "$inputPath\Logs\$rmsel"
$log = $log.Replace("txt","csv")
$csv = Import-Csv $input

If ($rmsel -notlike "*_*-*"){Write-Host "Invalid file name. The input file name must match the name created by the downdraft script." -F Red;"";Pause;Exit}

$rmheader = Get-Content -Path $input -TotalCount 1
If ($rmheader -ne '"DistinguishedName","SamAccountName","EmployeeID","DisplayName","Surname","GivenName","middleName","Office","Title"'){
Write-Host "The input file has incorrect headers." -F Red;Pause;Exit}

Write-Host "Enter the desired password that each account will be set too." -F Green
Write-Host "This is the password that will need entered into TICKET SYSTEM when closing the ticket." -F Green;""

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

##############################################################################################################################################################
# Connection to an Exchange server 
##############################################################################################################################################################

$exsvrs = (Get-ADComputer -Filter {Name -like "[SERVER HINT]-*"}).Name
Foreach ($exsvr in $exsvrs)
{
    If (Test-Connection $exsvr -Count 2){
    $session = New-PSSession -ConfigurationName Microsoft.Exchange -ConnectionUri http://$exsvr.[DOMAIN]]/Powershell/
    Import-PSSession $session -DisableNameChecking -AllowClobber -Verbose:$false -ErrorAction Stop | Out-Null
    Break}
}
If (Get-Command Set-RemoteMailbox)
{
$test = Get-RemoteMailbox -Filter * -ResultSize 2 -ErrorAction SilentlyContinue -WarningAction SilentlyContinue
}
If (!$test){Write-Host "Connection to exchange failed. Please try again." -F Red;Pause;Exit}

##############################################################################################################################################################
# Begin Loop & Counter
##############################################################################################################################################################

$i = 1
$csvcount = ($csv | Measure-Object).Count
Write-Progress -id 1 -Activity "Provisioning user accounts......" -PercentComplete 1

Foreach ($line in $csv)
{
Remove-Variable rm* -Force

##############################################################################################################################################################
# Variables
##############################################################################################################################################################

$rmuser = ($line.SamAccountName).ToUpper()
$rmSurname = ($line.Surname).ToLower()
$rmGivenName = ($line.GivenName).ToLower()
$rmInitials = ($line.middleName).ToUpper()
$rmdisplayname = $line.DisplayName
$rmoffice = $line.Office
$rmtitle = $line.Title
$rmeid = $line.EmployeeID
$rmdn = $line.DistinguishedName

If ($rmSurname){$rmSurname = (Get-Culture).TextInfo.ToTitleCase($rmSurname)}
If ($rmGivenName){$rmGivenName = (Get-Culture).TextInfo.ToTitleCase($rmGivenName)}
If ($rmInitials){$rmInitials = $rmInitials.Substring(0,1)}

If ($rmdisplayname){
$rmlower = ($rmdisplayname.Split("(")[0]).ToLower()
$rmfixed = (Get-Culture).TextInfo.ToTitleCase($rmlower)
$rmdisplayname = $rmdisplayname -Replace "$rmlower","$rmfixed"
$rmdisplayname = $rmdisplayname -replace "ii","II" -replace "iii","III" -replace "iv","IV"}

$rmname = $rmdisplayname.Split("(")[0];$rmname = $rmname.Substring(0,($rmname.Length - 1))

##############################################################################################################################################################
# Locates OU
##############################################################################################################################################################

Write-Progress -id 2 -parentId 1 -Activity "Provisioning user $rmuser......" -PercentComplete 1
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
            $rmus = Get-ADUser -Filter * -SearchBase $ou | Where {$_.DistinguishedName -like "*Endusers*" -or $_.DistinguishedName -like "*LEGAT*"}
                Foreach ($rmu in $rmus)
                {
                $dn = $rmu.DistinguishedName;$rep = ($dn -split (",OU"))[0];$tmp = $dn.Replace("$rep,","");$rmalldn += $tmp
                }
            }
        }
    }
$rmalldn = $rmalldn | Group-Object | Sort-Object Count
$rmou = ($rmalldn | Select-Object -Last 1).Name
}
If (!$(try {Get-ADUser -Filter * -SearchBase $rmou -SearchScope OneLevel -ResultSetSize 1} catch {$null})){$rmou = $null}
If (!$rmou){$rmou = "[USERS OU]";$rmout = "Created in default users OU."}
Write-Progress -id 2 -parentId 1 -Activity "Provisioning user $rmuser......" -PercentComplete 5

##############################################################################################################################################################
# Existing Account Check and Un Archive
##############################################################################################################################################################

If ($rmeid -like "?????????")
{
$rmtest = $(try {get-aduser -filter {EmployeeID -eq $rmeid} | where {$_.SamAccountName -notlike "[0-9]*"}} catch {$null})
$rmtest = $rmtest | sort LastLogonDate -Descending | Select -First 1
        
    If ($rmtest)
    {
    Write-Progress -id 1 -Activity "Provisioning user accounts......" -PercentComplete (($i / $csvcount) * 100)
    $i++

        If ($rmtest.Enabled -eq $false -and $rmtest.SamAccountName -eq $rmuser)
        {
            $rmtest1 = Get-MsolUser -UserPrincipalName $rmuser
            $rmtest2 = Get-MsolUser -UserPrincipalName $rmuser -ReturnDeletedUsers           
            If (!$rmtest1 -and !$rmtest2)
            {
            Set-ADUser $rmuser -clear msExchMailboxGuid
            Enable-RemoteMailbox -Identity $rmuser -RemoteRoutingAddress "$rmuser@[]" -DomainController $pdc `
                     -ErrorAction SilentlyContinue -WarningAction SilentlyContinue > $null                      
            }
            Set-Remotemailbox $rmuser -HiddenFromAddressListsEnabled $false -WarningAction SilentlyContinue
                
        Enable-ADAccount -Identity $rmuser
        Get-ADUser $rmuser | Move-ADObject -TargetPath $rmou 
        Set-ADAccountPassword $rmuser -Reset -NewPassword $pswd
        Set-ADUser $rmuser -DisplayName $rmdisplayname -Description $null
        Set-ADUser $rmuser -ChangePasswordAtLogon $true       
        If ($rmoffice){Set-ADUser $rmuser -Office $rmoffice}
        If ($rmtitle){Set-ADUser $rmuser -Title $rmtitle}

            $rmext6 = (Get-ADUser $rmuser -Properties extensionAttribute6).extensionAttribute6
            If (!$rmext6){$rmext6 = "365GS"}
            If ($rmext6 -notlike "*365GS*"){$rmext6 = $rmext6 + ", 365GS"}
            Set-ADUser $rmuser -replace @{"extensionAttribute6"=$rmext6}       
            
            $test = (Get-ADUser $rmuser -Properties Enabled).Enabled ; If ($test -eq $false){$rmout = "Failed";$failures++}    
            If (!$rmout){$rmout = "None"}
            $action = "Unarchived"
        }
        ElseIf ($rmtest.SamAccountName -ne $rmuser)    
        {
        $action = "Failed"
        $rmout = "SamAccountName mismatch"
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
    Continue
    }
}
Else
{
$hash =[pscustomobject]@{ 
SamAccountName = "$rmSurname, $rmGivenName"
EmployeeID = $rmeid
Action = "Failed"
Errors = "Invalid EmployeeID"}
$hash | export-csv $log -NoTypeInformation -Append
$hash = @{}    
Continue
}

##############################################################################################################################################################
# Test SamAccountName availability
##############################################################################################################################################################   

If ($(try {get-aduser $rmuser} catch {$null}))
{
$hash =[pscustomobject]@{ 
SamAccountName = $rmuser
EmployeeID = $rmeid
Action = "Failed"
Errors = "SamAccountname taken"}
$hash | export-csv $log -NoTypeInformation -Append
$hash = @{}    
Continue
}

##############################################################################################################################################################
# Creates account
##############################################################################################################################################################
  
$rmparam = @{
'Path' = $rmou 
'UserPrincipalName' = "$rmuser@[]" 
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

For ($a=5; $a -lt 25; $a++){Write-Progress -id 2 -parentId 1 -Activity "Provisioning user $rmuser......" -PercentComplete $a;Start-Sleep -Milliseconds 75}
    
If ($(try {get-aduser $rmuser} catch {$null}))
{
Set-ADUser $rmuser -Replace  @{extensionAttribute6="365GS"}
Set-ADUser $rmuser -Replace  @{info="Created $date. Script v$version"}
Get-aduser $rmuser | Rename-ADObject -NewName $rmname 
Enable-RemoteMailbox -Identity $rmuser -RemoteRoutingAddress "$rmuser@dojfbi.mail.onmicrosoft.com" -DomainController $pdc `
                     -ErrorAction SilentlyContinue -WarningAction SilentlyContinue > $null 
    $ii = 1
    Do
    {
        If ($ii -eq 1) 
        {
        For ($a=25; $a -lt 100; $a++){Write-Progress -id 2 -parentId 1 -Activity "Provisioning user $rmuser......" -PercentComplete $a;Start-Sleep -Milliseconds 75}
        Write-Progress -id 2 -parentId 1 -Activity "Provisioning user $rmuser......" -Complete
        }
        Else
        {
        For ($a=1; $a -lt 100; $a++){Write-Progress -id 2 -parentId 1 -Activity "Retrying account creation for $rmuser......" -PercentComplete $a;Start-Sleep -Milliseconds 100}
        Write-Progress -id 2 -parentId 1 -Activity "Retrying account creation for $rmuser......" -Complete
        }
    $ii++
    }
    Until(((Get-aduser $rmuser -Properties Mail).Mail) -or $ii -eq 5)

    If (!((Get-aduser $rmuser -Properties Mail).Mail))
    {          
    $hash =[pscustomobject]@{ 
    SamAccountName = $rmuser
    EmployeeID = $rmeid
    Action = "Account Created"
    Errors = "Failed to enable mailbox"}
    $hash | export-csv $log -NoTypeInformation -Append
    $hash = @{}
    $failures++
        If ($failures -eq 2){Write-Host "The script has encountered 2 consecutive creation failures and has been terminated." -F Red;Pause;Exit}
    Continue 
    }
$failures = 0
} 
Else 
{
$hash =[pscustomobject]@{ 
SamAccountName = $rmuser
EmployeeID = $rmeid
Action = "Failed"
Errors = "Failed to create AD object"}
$hash | export-csv $log -NoTypeInformation -Append
$hash = @{}
$failures++
If ($failures -eq 2){Write-Host "The script has encountered 2 consecutive creation failures and has been terminated." -F Red;Pause;Exit}
Continue 
}

If (!$rmout){$rmout = "None"}
$hash =[pscustomobject]@{ 
SamAccountName = $rmuser
EmployeeID = $rmeid
Action = "Account Created"
Errors = $rmout}
$hash | export-csv $log -NoTypeInformation -Append
$hash = @{}

Write-Progress -id 2 -parentId 1 -Activity "Provisioning user $rmuser......" -Complete
Write-Progress -id 1 -Activity "Provisioning user accounts......" -PercentComplete (($i / $csvcount) * 100)
$i++
} # End foreach

Write-Progress -id 1 -Activity "Provisioning user accounts......" -Complete
##############################################################################################################################################################
# Cleanup and End                     
##############################################################################################################################################################

$date1 = (get-date).adddays(-1)
$date7 = (get-date).adddays(-7)
Move-Item $input "$inputPath\Completed" -Force
$items = (Get-ChildItem -Path "$inputPath\Logs").Name
Foreach ($item in $items)
{
$logfile = "$inputPath\Logs\$item"
$itemdate = (Get-Item $logfile).lastwritetime
    If ($itemdate -lt $date7){Move-Item $logfile $inputPath -Force}
}
$items = (Get-ChildItem -Path "$inputPath\Completed").Name
Foreach ($item in $items)
{
$inputfile = "$inputPath\Completed\$item"
$itemdate = (Get-Item $inputfile).lastwritetime
    If ($itemdate -lt $date7){Remove-Item $inputfile -Recurse -Force}
}
$items = (Get-ChildItem -Path "$inputPath\Input\*.txt").Name
Foreach ($item in $items)
{
$inputfile = "$inputPath\$item"
$itemdate = (Get-Item $inputfile).lastwritetime
    If ($itemdate -lt $date1){Remove-Item $inputfile -Recurse -Force}
}
If ($session){Remove-PSSession $session}
Remove-Variable rm* -Force    ;"";"";""
Write-Host "----------------------------------------------------------------------------------------------------------------" -F Green
Write-Host "Users Created........." -F Green
Write-Host "----------------------------------------------------------------------------------------------------------------" -F Green
Pause
##############################################################################################################################################################
# End                     
##############################################################################################################################################################

