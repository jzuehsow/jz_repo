




##############################################################################################################################################################


##############################################################################################################################################################
$version = "2.0"

$banner = "----------------------------------------------------------------------------------------------------------------------
----------------------------------------------------------------------------------------------------------------------                                                                                                                     

                                      Shared Mailbox Script - Version $version
                                                                                                                                                                              
----------------------------------------------------------------------------------------------------------------------
----------------------------------------------------------------------------------------------------------------------




"
$pshost = get-host;$pswindow = $pshost.UI.RawUI;$newsize = $pswindow.BufferSize;$newsize.Height = 65;$newsize.Width = 120;$pswindow.BufferSize = $newsize

$pdc = Get-ADDomain | Select-Object PDCEmulator
$pdc = $pdc.PDCEmulator
$PSDefaultParameterValues = @{"*-AD*:Server"="$pdc"}

$wid=[System.Security.Principal.WindowsIdentity]::GetCurrent()
$prp=new-object System.Security.Principal.WindowsPrincipal($wid)
$adm=[System.Security.Principal.WindowsBuiltInRole]::Administrator
$isadm = $prp.IsInRole($adm)

$admin = $env:username ; $rmsvr = $env:COMPUTERNAME
$rmgptest = Get-ADPrincipalGroupMembership $admin | select name | where {$_.name -like "**" -or $_.name -eq ""}

Clear-Host;$banner
If (!$rmgptest){Write-Host "Only members of MDSU administrative groups are allowed to run this script." -F Red;Pause;Exit}
If ($rmisadm -eq $false){Write-Host "Powershell not running as administrator." -F Red;Pause;Exit}

$ErrorActionPreference = "SilentlyContinue"
$WarningPreference = "SilentlyContinue"
$date = Get-Date -Format MM/dd/yy

##############################################################################################################################################################
# User guide check
##############################################################################################################################################################

$guide = "[INPUT PATH]\Shared Mailbox Guide.pdf"
If (!(Test-Path $guide)){Write-Host "Could not located the user guide located at:" -F Red;Write-Host $guide -F Red;Pause;Exit}

##############################################################################################################################################################
# Ticket and Requestor Info
##############################################################################################################################################################

Do
{
$ticket = Read-Host "Enter ticket number of shared mailbox request"
    If ($ticket -notlike "*???*"){Write-Host "Invalid ticket number." -F Red}
}
Until ($ticket -like "*???*")
$ticket = ($ticket).ToUpper()
""
Do
{
$req = Read-Host "Enter the username of the mailbox requestor"
$reqdn = $(try {(get-aduser $req).DistinguishedName} catch {$null})

    If (!($reqdn)){Write-Host "User not found" -F Red}
}
Until ($reqdn)
""
##############################################################################################################################################################
# Locates OUs
##############################################################################################################################################################

$gpbase = [GROUPS OU]
$mbbase = [SMBX OU]

$dn = $reqdn.Split(",")
Foreach ($field in $dn)
{
    If ($field -like "OU*")
    {
    $name = (($field).Replace("OU=",""))
        If($name -eq "Legats"){$gpou = "[OCONUS OU]" ; Break}
    $gpou = (Get-ADOrganizationalUnit -Filter {Name -eq $name} -SearchBase $gpbase).DistinguishedName
    If ($gpou){Break}
    }
}

If ($gpou.count -gt 1)
{
    Foreach ($field in $dn)
    {
    $gpou = $gpou | Where {$_ -like "*$field*"}
        If ($gpou.count -eq 1){Break}
    }
}

Foreach ($field in $dn)
{
    If ($field -like "OU*")
    {
    $name = (($field).Replace("OU=",""))
    $mbou = (Get-ADOrganizationalUnit -Filter {Name -eq $name} -SearchBase $mbbase).DistinguishedName
    If ($mbou){Break}
    }
}

If ($mbou.count -gt 1)
{
    Foreach ($field in $dn)
    {
    $mbou = $mbou | Where {$_ -like "*$field*"}
        If ($mbou.count -eq 1){Break}
    }
}

If (!$mbou){$mbou = $mbbase;$error1 = "Mailbox created at [TOP LEVEL SMBX OU]. Please move to the correct sub OU."}
If (!$gpou){$gpou = $gpbase;$error2 = "Group created at [TOP LEVEL GROUPS OU]. Please move to the correct sub OU."}


##############################################################################################################################################################
# Mailbox Name
##############################################################################################################################################################

Do
{
$mbname = Read-Host "Enter the desired shared mailbox name"
    If ($mbname -like "*@*"){Write-Host "Enter only the mailbox name. Do not include @[]." -F Red}
    If ($mbname -like "* *"){Write-Host "The mailbox name cannot contain spaces." -F Red}
    If ($mbname.length -gt 20){Write-Host "The mailbox name must be 20 characters or less." -F Red}
}
Until ($mbname -notlike "*@*" -and $mbname -notlike "* *" -and $mbname.length -le 20)

##############################################################################################################################################################
# Connection to an Exchange server 
##############################################################################################################################################################

$exsvrs = (Get-ADComputer -Filter {Name -like "[EXCH SVR HINT]-*"}).Name
Foreach ($exsvr in $exsvrs)
{
    If (Test-Connection $exsvr -Count 2){
    $session = New-PSSession -ConfigurationName Microsoft.Exchange -ConnectionUri http://$exsvr.[DOMAIN]/Powershell/
    Import-PSSession $session -DisableNameChecking -AllowClobber -Verbose:$false -ErrorAction Stop | Out-Null
    Break}
}
If (Get-Command Set-RemoteMailbox)
{
$test = Get-RemoteMailbox -Filter * -ResultSize 2 -ErrorAction SilentlyContinue -WarningAction SilentlyContinue
}
If (!$test){Write-Host "Connection to exchange failed. Please try again." -F Red;Pause;Exit}

##############################################################################################################################################################
# Checks name availability
##############################################################################################################################################################

$taken= $null
$secgp = "SGSM_$mbname"
If($(try {get-adgroup $secgp} catch {$null})){$taken = "$secgp aready exists. Run the script again and try another name."}
ElseIf($(try {get-adgroup $mbname} catch {$null})){$taken = "The mailbox name is in use by a security group. Run the script again and try another name."}
ElseIf($(try {get-aduser $mbname} catch {$null})){$taken = "The mailbox name entered is unavailable. Run the script again and try another name."}
ElseIf(Get-Mailbox $mbname -WarningAction SilentlyContinue -ErrorAction SilentlyContinue){$taken = $true}
ElseIf(Get-Remotemailbox $mbname -WarningAction SilentlyContinue -ErrorAction SilentlyContinue){$taken = $true}
      
If ($taken){Write-Host $taken -F Red;Pause;Exit}

##############################################################################################################################################################
# Creates Mailbox
##############################################################################################################################################################

Write-Progress -Activity "Creating Shared Mailbox....." -PercentComplete 10

New-Mailbox -Name $mbname -Alias $mbname -OrganizationalUnit $mbou -UserPrincipalName "$mbname@[DOMAIN]" -Shared -DomainController $pdc `
-ErrorAction SilentlyContinue -WarningAction SilentlyContinue > $null

    If (!(Get-Mailbox $mbname -DomainController $pdc -ErrorAction SilentlyContinue -WarningAction SilentlyContinue))
    {
    ""
    Write-Progress -Activity "Creating Shared Mailbox....." -Completed
    Write-Host "Unable to create shared mailbox." -F Red
    "";Pause;Exit
    }

Write-Progress -Activity "Creating Shared Mailbox....." -PercentComplete 20

##############################################################################################################################################################
# Creates AD security group
##############################################################################################################################################################

$info = "Grants access to shared mailbox: $mbname
Created by: $admin - $date
Ticket#: $ticket
Script v.$version"

New-DistributionGroup -Name $secgp -Type "Security" -OrganizationalUnit $gpou -Members $req -DomainController $pdc `
-ErrorAction SilentlyContinue -WarningAction SilentlyContinue > $null

Set-DistributionGroup -Identity $secgp -HiddenFromAddressListsEnabled $true -DomainController $pdc `
-ErrorAction SilentlyContinue -WarningAction SilentlyContinue > $null

Start-Sleep 2

    If (!($(try {Get-ADGroup $secgp -Server $pdc} catch {$null})))
    {
    "";Write-Progress -Activity "Creating Shared Mailbox....." -Completed
    Write-Host "Unable to create security group." -F Red
    "";Pause;Exit
    }

Set-ADGroup $secgp -Replace @{info=$info} -Server $pdc 
Set-ADGroup $secgp -Replace @{"extensionAttribute6"="365GS"} -Server $pdc
Write-Progress -Activity "Creating Shared Mailbox....." -PercentComplete 30 

##############################################################################################################################################################
# Sets group manager
##############################################################################################################################################################


Set-ADGroup $secgp -Managedby $req -Server $pdc 
$gpnamedn = (Get-ADGroup $secgp -Server $pdc).distinguishedname

dsacls "\\$pdc\$gpnamedn" /G FBI\$req`:WP`;member`; > $null
$ckbox = dsacls "\\$pdc\$gpnamedn" | where {$_ -like "Allow FBI\$req*SPECIAL ACCESS for Add/Remove self as member"}

If (!$ckbox){Write-Host "An error has occured. Manually check the box in AD to allow the manager to update members"}


##############################################################################################################################################################
# Sets mailbox permissions
##############################################################################################################################################################

add-mailboxpermission -Identity $mbname -User $secgp -AccessRights "Fullaccess" -InheritanceType "all" -DomainController $pdc `
-ErrorAction SilentlyContinue -WarningAction SilentlyContinue > $null

Set-Mailbox -Identity $mbname -MessageCopyForSentAsEnabled $true -MessageCopyForSendOnBehalfEnabled $true `
-ErrorAction SilentlyContinue -WarningAction SilentlyContinue > $null

Add-ADPermission -Identity $mbname -User $secgp -ExtendedRights "Send-As" -DomainController $pdc `
-ErrorAction SilentlyContinue -WarningAction SilentlyContinue > $null

Write-Progress -Activity "Creating Shared Mailbox....." -PercentComplete 50

##############################################################################################################################################################
# Additional AD attributes
##############################################################################################################################################################

$info = "Account for shared mailbox: $mbname
Created by: $admin - $date
Ticket#: $ticket
Script v.$version"

Set-ADUser $mbname -EmployeeID "N/A (Mailbox)" -Replace @{info=$info} -Add @{"extensionAttribute6"="365GS,365EN"} -Server $pdc
Write-Progress -Activity "Creating Shared Mailbox....." -PercentComplete 55

##############################################################################################################################################################
# Console output
##############################################################################################################################################################

for ($a=60; $a -lt 100; $a++) {Write-Progress -Activity "Creating Shared Mailbox....." -PercentComplete $a;Start-Sleep -Milliseconds 200}
Write-Progress -Completed " "
$emailaddress = (Get-AdUser -Filter {Name -like $mbname} -Properties EmailAddress -Server $pdc).EmailAddress
"";""
If (!($emailaddress)){Write-Host "Shared mailbox creation failed." -F Red;Pause;Exit}
Write-Host "Shared mailbox creation complete. " -F Green;""
Write-Host "Security Group: " -F Green -NoNewline; Write-Host $secgp -F magenta;""
Write-Host "Email Address: " -F Green -NoNewline; Write-Host $emailaddress -F magenta;"";""

##############################################################################################################################################################
# Enduser notIfication email
##############################################################################################################################################################

$admeid = Get-ADUser $admin -properties EmployeeNumber,EmployeeID
If ($admeid.EmployeeNumber -like "?????????"){$admeid = $admeid.EmployeeNumber}
ElseIf ($admeid.EmployeeID -like "?????????"){$admeid = $admeid.EmployeeID}

    If ($admeid -like "?????????")
    {
    $useraccount = $(try {(get-aduser -filter {EmployeeID -eq $admeid} | where {$_.SamAccountName -notlike "*-*"}).SamAccountName} catch {$null})
    }

    If (!$useraccount)
    {
        Do
        {
        $useraccount = Read-Host "Enter the username for your regular account, where emails can be sent from"
        $useraccounttry = $(try {get-aduser $useraccount} catch {$null})
            If (!($useraccounttry)) {"";Write-Host "Invalid username" -F Red}
        }
        Until ($useraccounttry)
    }

$from = (Get-ADUser $useraccount -Properties EmailAddress).EmailAddress
$to = (Get-ADUser $req -Properties EmailAddress).EmailAddress
$guide = "[INPUT PATH]\Shared Mailbox Guide.pdf"

$body = "

The shared mailbox --   $mbname   -- has been created. Please do not use it for 48 hours, to allow time for 
it to be migrated to the Office 365 cloud. If the usage need is mission critical, please let me know, and the 
migration request can be expedited. 

Attached is a PDF guide that covers using the shared mailbox, including managing members who have access.
    
 

Email Address:  $emailaddress

Display Name:  $mbname

Security Group:  $secgp



It may take up to 30 minutes, before you will be able to manage member access.






"
Send-MailMessage -From $from -To $to -CC $from -Subject "Shared Mailbox Created -- $ticket" -Body "$body" `
-Attachments $guide -SmtpServer Smtp.fbi.gov

##############################################################################################################################################################
#  Log File                                                  
##############################################################################################################################################################

$log = "
*******************************************************************************
   Shared Mailbox     ::     Shared Mailbox Script - Version $version                                  
*******************************************************************************


Created:  $date

Administrator:  $admin



*******************************************************************************








Email Address:  $emailaddress

Display Name:  $mbname

Security Group:  $secgp















*******************************************************************************
"
Out-File -filepath "[LOG PATH]\Shared Mailboxes\$mbname.txt" -InputObject $log

"";""
Write-Host $error1 -F Red
Write-Host $error2 -F Red
"";""

Write-Host "----------------------------------------------------------------------------------------------------------------" -F Green
Write-Host "Shared mailbox created........." -F Green
Write-Host "----------------------------------------------------------------------------------------------------------------" -F Green

##############################################################################################################################################################
# Enduser notIfication email
##############################################################################################################################################################

If ($session){Remove-PSSession $session}
Pause