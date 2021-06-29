<#############################################################################################################################################################

Author - Jeremy Zuehsow
Purpose - RED shared mailbox creation.

Change Log:
v2.1 - Modifications to script per Exchange team request



#############################################################################################################################################################>

#IMPORT COMMOON FUNCTIONS

Start_Script
New_ExchangeSession

Remove-Variable * -Force -ErrorAction SilentlyContinue
$ErrorActionPreference = 'SilentlyContinue'
$WarningPreference = 'SilentlyContinue'
$pshost = get-host;$pswindow = $pshost.UI.RawUI;$newsize = $pswindow.BufferSize
$newsize.Height = 65;$newsize.Width = 120;$pswindow.BufferSize = $newsize

$mbxOU = "[SMBX OU]"
$sgsmOU = "[SGSM OU]"
$guide = "[GUIDE PDF]"
$logPath = "[LOG PATH]\Shared Mailboxes"
$smtp = '[SMTP]'
$version = "2.1"
$banner = "
----------------------------------------------------------------------------------------------------------------------
----------------------------------------------------------------------------------------------------------------------                                                                                                                     

                                      Shared Mailbox Script - Version $version
                                                                                                                                                                              
----------------------------------------------------------------------------------------------------------------------
----------------------------------------------------------------------------------------------------------------------
"
Clear-Host;$banner


##############################################################################################################################################################
# Input checks
##############################################################################################################################################################

if (!(New-Object System.Security.Principal.WindowsPrincipal([System.Security.Principal.WindowsIdentity]::GetCurrent())).IsInRole([System.Security.Principal.WindowsBuiltInRole]::Administrator))
{
    Write-Host "Powershell not running as administrator." -F Red; Pause; Exit
}

if (!(Test-Path $guide)) {Write-Host "Could not find the user guide located at: $guide" -F Red; Pause; Exit}


##############################################################################################################################################################
# Enter Ticket Info
##############################################################################################################################################################

Do
{
    $ticket = (Read-Host "`nEnter ticket number of shared mailbox request").ToUpper()
    if (!$ticket) {Write-Host "`nPlease enter a ticket number." -F Red}
}
Until ($ticket)

Do
{
    $user = (Get-ADUser (Read-Host "`nEnter the username of the mailbox requestor") -Server $pdc).SamAccountName
    if (!$user) {Write-Host "`nUser not found." -F Red}
}
Until ($user)

Do
{
    $pass = $true
    $mbxName = Read-Host "`nEnter the desired shared mailbox name"
    
    Do
    {
        if ($mbxName -like "*@*")
        {
            Write-Host "`nEnter only the mailbox name. Do not include domain (e.g. @[DOMAIN])." -F Red
            $mbxNameTemp = $mbxName.Substring(0,$mbxName.IndexOf('@'))
            Write-Host "`nThe new mailbox name is: " -NoNewline -F Red; Write-Host $mbxNameTemp -F Magenta
            Do
            {
                $rmAt = Read-Host "`nAccept new mailbox name (Y/N)"
                if ($rmAt -eq 'Y') {$mbxName = $mbxNameTemp}
                else {$pass = $false}
            }
            Until ($rmAt -eq 'Y' -or $rmAt -eq 'N')
        }
    }
    Until ($mbxName -notlike "*@*" -or $rmAt -eq 'N')

    Do
    {
        if ($mbxName -like "* *")
        {
            Write-Host "`nThe mailbox name cannot contain spaces." -F Red
            $mbxNameTemp1 = $mbxName.TrimEnd() -replace " "
            $mbxNameTemp2 = $mbxName.TrimEnd() -replace " " , "."
            $mbxNameTemp3 = $mbxName.TrimEnd() -replace " " , "-"
            $mbxNameTemp4 = $mbxName.TrimEnd() -replace " " , "_"
            
            Write-Host "`nWould you like to replace spaces with one of the options below?`n
            1) $mbxNameTemp1
            2) $mbxNameTemp2
            3) $mbxNameTemp3
            4) $mbxNameTemp4
            5) None of the above"
            
            Do {$rmSPC = Read-Host "`nSelect Option"}
            Until ($rmSPC -ge '1' -and $rmSPC -le '5')
            
            if ($rmSPC -eq '1') {$mbxName = $mbxNameTemp1}
            if ($rmSPC -eq '2') {$mbxName = $mbxNameTemp2}
            if ($rmSPC -eq '3') {$mbxName = $mbxNameTemp3}
            if ($rmSPC -eq '4') {$mbxName = $mbxNameTemp4}
            if ($rmSPC -eq '5') {$pass = $false}
        }
    }
    Until ($mbxName -notlike "* *" -or $rmSPC -eq '5')

    if ($mbxName.length -gt 20) {Write-Host "`nThe mailbox name must be 20 characters or less." -F Red; $pass = $false}
    
    if (Get-ADGroup $mbxName -Server $pdc) {Write-Host "`n$mbxName is the name of an existing security group." -F Red; $pass = $false}
    if (Get-ADUser $mbxName -Server $pdc) {Write-Host  "`n$mbxName is the name of an existing user." -F Red; $pass = $false}
    if (Get-RemoteMailbox $mbxName -DomainController $pdc) {Write-Host  "`n$mbxName is the name of an existing mailbox." -F Red; $pass = $false}

    if ($pass)
    {
        $sgsmName = "SGSM_$mbxName"
        if (Get-ADGroup $sgsmName -Server $pdc)
        {
            Write-Host "`nSecurity group $sgsmName already exists." -F Red
            Do
            {
                $useOldSGSM = Read-Host "`nWould you like to link the existing group (Y/N)"
                if ($useOldSGSM -eq 'N') {Write-Host "Exiting..." -F Red; Pause; Exit}
            }
            Until ($useOldSGSM -eq 'Y')
        }

        if ($mbxNameTemp)
        {
            Do
            {
                Write-Host "`nDoes this information appear correct?"
                Write-host "`nMailbox Name: " -NoNewline; Write-Host $mbxName -F Magenta
                Write-Host "`nSecurity Group: " -NoNewLine; Write-Host $sgsmName -F Magenta
                $ok = Read-Host "`nDoes this information appear correct (Y/N)"
                if ($ok -eq 'N') {$pass = $false}
            }
            Until (($ok -eq 'Y') -or ($ok -eq 'N'))
        }
    }
    
    if ($mbxNameTemp -and $pass)
    {
        Do
        {
            Write-Host "`nDoes this information appear correct?"
            Write-host "`nMailbox Name: " -NoNewline; Write-Host $mbxName -F Magenta
            Write-Host "`nSecurity Group: " -NoNewLine; Write-Host $sgsmName -F Magenta
            $ok = Read-Host "`nDoes this information appear correct (Y/N)"
            if ($ok -eq 'N') {Write-Host "`nExiting...`n" -F Red; Pause; Exit}
        }
        Until ($ok -eq 'Y')
    }

}
Until ($pass)

Do
{
    $addSelf = Read-Host "`nWould you like to add your user account to test the shared mailbox (Y/N)"
    if (($addSelf -ne 'Y') -and ($addself -ne 'N')) {$addSelf = $null; Write-Host "`nNot a valid response." -F Red}
}
Until ($addSelf)


##############################################################################################################################################################
# Creates Mailbox
##############################################################################################################################################################

Write-Progress -Activity "Creating Shared Mailbox....." -PercentComplete 0
New-RemoteMailbox -Name $mbxName -OnPremisesOrganizationalUnit $mbxOU -Shared -DomainController $pdc | Out-Null
$i = 0
while (!(Get-RemoteMailbox $mbxName -DomainController $pdc) -and $i -le 10)
{
    Write-Progress -Activity "Creating Shared Mailbox....." -PercentComplete ($i*2)
    Start-Sleep $i; $i++
}
if (!(Get-RemoteMailbox $mbxName -DomainController $pdc))
{
    Do
    {
        Write-Host "`nUnable to create shared mailbox." -F Red
        $wait = Read-Host "Would you like to wait an additional 60 seconds (Y/N)"
        if ($wait -eq 'Y') {Start-Sleep 60}
        elseif ($wait -eq 'N') {Pause; Exit}
        else {Write-Host "Please enter 'Y' or 'N' to continue" -F Red}
    }
    Until (Get-ADUser $mbxName -Server $pdc)
}


##############################################################################################################################################################
# Creates AD security group
##############################################################################################################################################################

Write-Progress -Activity "Creating Security Group....." -PercentComplete 20
$i = 0
While (!(Get-DistributionGroup $sgsmName -DomainController $pdc))
{
    New-DistributionGroup $sgsmName -OrganizationalUnit $sgsmOU -Alias $sgsmName -DomainController $pdc | Out-Null
    Do
    {
        Write-Progress -Activity "Creating Security Group....." -PercentComplete (20+$i*2)
        Start-Sleep $i; $i++
        If ($i -ge 1)
        {
            Write-Host "`nUnable to create security group. " -F Red -NoNewline
            Do
            {
                $retry = Read-Host "Try again (Y/N)"
                If ($retry -eq 'Y') {$i = 0; Break;Break;Break}
                ElseIf ($retry -eq 'N') {Write-Host "Exiting --> " -F Red -NoNewline; Pause; Exit}
                Else {Write-Host "Invalid selection. " -F Red -NoNewline}
            }
            Until ($retry -eq 'Y')
        }
    }
    Until (Get-ADGroup $sgsmName -Server $pdc)
}


Write-Progress -Activity "Configuring Security Group....." -PercentComplete 40
Set-DistributionGroup $sgsmName -HiddenFromAddressListsEnabled $true -DomainController $pdc
Set-ADGroup $sgsmName -GroupScope Universal -GroupCategory Security -ManagedBy $user -Server $pdc
Add-ADGroupMember $sgsmName -Members $user -Server $pdc
if ($addSelf -eq 'Y') {Add-ADGroupMember $sgsmName -Members $adminSam -Server $pdc}


Write-Progress -Activity "Configuring Shared Mailbox....." -PercentComplete 60
#Set-MailboxSentItemsConfiguration $mbxName -SendAsItemsCopiedTo SenderAndFrom -SendOnBehalfOfItemsCopiedTo SenderAndFrom
Set-RemoteMailbox $mbxName -GrantSendOnBehalfTo $sgsmName -MessageCopyForSendOnBehalfEnabled
Do
{
    Add-MailboxPermission $mbxName -User $sgsmName -AccessRights FullAccess -InheritanceType All -DomainController $pdc | Out-Null
    $checkFullAccess = Get-MailboxPermission $mbxName -DomainController $pdc | ? {$_.User -like "*$sgsmName*" -and $_.AccessRights -like "*FullAccess*"}
}
Until ($checkFullAccess)


##############################################################################################################################################################
# Sets group manager
##############################################################################################################################################################

Write-Progress -Activity "Configuring Security Group Permissions....." -PercentComplete 70 
$sgsmDN = (Get-ADGroup $sgsmName -Server $pdc).DistinguishedName
try {dsacls "\\$pdc\$sgsmDN" /G "GREEN\$user`:WP`;Member" | Out-Null}
catch {Write-Host "Failed to check 'Manger can update membership list' box. Manually check the box in AD to allow the manager to update members." -F Red}

Write-Progress -Activity "Configuring Shared Mailbox Permissions....." -PercentComplete 80

$mbxDN = (Get-ADUser $mbxName -Server $pdc).DistinguishedName
try {dsacls "\\$pdc\$mbxDN" /G "GREEN\$sgsmName`:CA`;Send As" | Out-Null}
catch {Write-Host "Failed to add 'Send As' permissions to the mailbox. Manually add the permission in the AD object's security tab." -F Red}

Write-Progress -Activity "Configuring Shared Mailbox Permissions....." -PercentComplete 90


##############################################################################################################################################################
# Additional AD attributes
##############################################################################################################################################################

$info = "Account for shared mailbox: $mbxName
Created by: $admin - $date
Ticket#: $ticket
Script v.$version"

Set-ADUser $mbxName -EmployeeID "N/A (Mailbox)" -Server $pdc
Set-ADUser $mbxName -Add @{info=$info} -Server $pdc
Set-ADUser $mbxName -Add @{"extensionAttribute6"="365GS"} -Server $pdc


##############################################################################################################################################################
# Error Checking
##############################################################################################################################################################

$mbx = Get-ADUser $mbxName -Properties * -Server $pdc
$sgsm = Get-ADGroup $sgsmName -Properties * -Server $pdc
$members = (Get-ADGroupMember $sgsmName -Server $pdc).SamAccountName

if ($mbx.DistinguishedName -notlike "*OU=_Organizational Mailboxes,OU=GREEN,DC=GREEN,DC=COM") {$ecArray += "Shared Mailbox in wrong OU, "}
if ($mbx.EmployeeID -ne "N/A (Mailbox)") {$ecArray += "Shared Mailbox EID incorrect, "}
if ($mbx.Enabled -eq $true) {$ecArray += "Shared Mailbox is enabled, "}
if ($mbx.mail -ne "$mbxName@GREEN.com") {$ecArray += "Shared mailbox email does not match the name, "}
#mbx security group send as
#exch full access
#mbx type is shared
if ($members -notlike "*$user*") {$ecArray += "Security group membership does not include $user, "}
if ($sgsm.ManagedBy -notlike (Get-ADUser $user).DistinguishedName) {$ecArray += "Security group manager is not $user, "}
#sg check box
if ($sgsm.GroupCategory -ne "Security") {$ecArray += "Security group category is not 'Security', "}
if ($sgsm.GroupScope -ne "Universal") {$ecArray += "Security group scope is not 'Universal', "}
#sg hide from address list
$ecArray += ";"
$ecArray = $ecArray -replace ", ;"

Write-Progress -Activity "Creating Shared Mailbox Completed" -Completed


##############################################################################################################################################################
# Console output
##############################################################################################################################################################

if ($mbxEmail = (Get-AdUser $mbxName -Properties EmailAddress -Server $pdc).EmailAddress)
{
    Write-Host "`nShared mailbox creation complete." -F Green
    Write-Host "`nSecurity Group: " -F Green -NoNewline; Write-Host $sgsmName -F magenta
    Write-Host "`nEmail Address: " -F Green -NoNewline; Write-Host $mbxEmail -F magenta
}
else {Write-Host "`nShared mailbox creation failed." -F Red; Pause; Exit}


##############################################################################################################################################################
# Enduser notification email
##############################################################################################################################################################

$fromMBX = $adminEmail
$toMBX = (Get-ADUser $user -Properties EmailAddress).EmailAddress
$subject = "Shared Mailbox Created -- $ticket"
$body = "

The shared mailbox --   $mbxName   -- has been created. 

Attached is a PDF guide that covers using the shared mailbox, including managing members who have access.
    
 

Email Address:  $mbxEmail

Display Name:  $mbxName

Security Group:  $sgsmName




It may take up to 1 hour, before you will be able to manage member access.

Please allow up to 72 hours for cloud migration in order to use the mailbox.






"
Send-MailMessage -From $fromMBX -To $toMBX -CC $fromMBX -Subject $subject -Body $body -Attachments $guide -SmtpServer $smtp


##############################################################################################################################################################
#  Log File                                                  
##############################################################################################################################################################

If (!(Test-Path $logPath)) {New-Item $logPath -ItemType Directory | Out-Null}

$log = "
*******************************************************************************
   Shared Mailbox     ::     Shared Mailbox Script - Version $version                                  
*******************************************************************************


Created:  $date

Administrator:  $admin

Errors:  $ecArray

*******************************************************************************








Email Address:  $mbxEmail

Display Name:  $mbxname

Security Group:  $sgsmName















*******************************************************************************
"
Out-File -FilePath "$logPath\$mbxName.txt" -InputObject $log | Out-Null

"`n`n`n`n"

Write-Host "----------------------------------------------------------------------------------------------------------------" -F Green
Write-Host "Shared mailbox created........." -F Green
Write-Host "----------------------------------------------------------------------------------------------------------------" -F Green

Stop_Script