




##############################################################################################################################################################
<# 
Author - 
Purpose - Retry enabling mailboxes without supressing errors. 
12/11/2017 - Script adds 365EN to EA6
02/07/2017 - Changed script to launch txt file for multi user input.




#>                         
##############################################################################################################################################################
$banner = "
----------------------------------------------------------------------------------------------------------------------
----------------------------------------------------------------------------------------------------------------------                                                                                                                     

                                           Enable Remote Mailbox
                                                                                                                                                                              
----------------------------------------------------------------------------------------------------------------------
----------------------------------------------------------------------------------------------------------------------









"
Clear-Host;$banner

$pshost = get-host;$pswindow = $pshost.UI.RawUI;$newsize = $pswindow.BufferSize;$newsize.Height = 65;$newsize.Width = 120;$pswindow.BufferSize = $newsize
$pdc = (Get-ADDomain | Select-Object PDCEmulator).PDCEmulator;$PSDefaultParameterValues = @{"*-AD*:Server"="$pdc"}

$wid=[System.Security.Principal.WindowsIdentity]::GetCurrent();$prp=new-object System.Security.Principal.WindowsPrincipal($wid)
$adm=[System.Security.Principal.WindowsBuiltInRole]::Administrator;$isadm = $prp.IsInRole($adm)

$rmadm = $env:username;$rmsvr = $env:COMPUTERNAME
$rmgptest = Get-ADPrincipalGroupMembership $rmadm | where {$_.name -like "*[ADMIN GROUP]*" -or $_.name -eq "[ADMIN GROUP]"}

Clear-Host;$banner
If (!$rmgptest){Write-Host "Only members of administrative groups are allowed to run this script." -F Red;Pause;Exit}
#If ("" -ne $rmsvr){Write-Host "As a breakfix, the provisioning script must be ran from [ADMIN SERVER]." -F Red;Pause;Exit}
If ($rmisadm -eq $false){Write-Host "Powershell not running as administrator." -F Red;Pause;Exit}

$ErrorActionPreference = "SilentlyContinue"
$WarningPreference = "SilentlyContinue"

##############################################################################################################################################################
#   Exchange Connections
##############################################################################################################################################################

If (!(Get-Command Get-Mailbox))
{
    $exsvrs = (Get-ADComputer -Filter {Name -like "[EXCHANGE SERVER HINT]-*"}).Name
    Foreach ($exsvr in $exsvrs)
    {
        If (Test-Connection $exsvr -Count 2)
        {
        $session = New-PSSession -ConfigurationName Microsoft.Exchange -ConnectionUri http://$exsvr.[DOMAIN]/Powershell/
        Import-PSSession $session -DisableNameChecking -AllowClobber -Verbose:$false > $null       
            If (Get-Command Get-Mailbox){Break}
        }
    }
}
If (!(Get-Command Get-Mailbox)){Write-Host "Connection to on prem exchange failed. Please try again." -F Red;Pause;Exit}

##############################################################################################################################################################
# Data Input & Exchange Conneection
##############################################################################################################################################################

$i = 0
$tmpfile = Get-Date -format yyMMddHHmmss ; $tmpfile =  "$env:LOCALAPPDATA\$tmpfile.txt"
New-Item $tmpfile -ItemType File > $null

If (!(Test-Path $tmpfile)){Write-Host "An error has occured." -F Red;Pause;Exit}

Clear-Host;$banner    
Write-Host "Press enter to launch notepad. Add each users UPN or SamAccountNsame to notepad, one user per line." -F Yellow
Write-Host "The script will continue once notepad is saved and closed. Select save, NOT save as." -F Yellow -NoNewline ; Read-Host " ";""
Invoke-Item $tmpfile

Do{$users = Get-Content $tmpfile;Start-Sleep 1;$i++;If($i -eq 300){Write-Host "The script has been paused." -F Green;Pause}} Until ($users -or $i -eq 300)
If ($i -eq 300){$users = Get-Content $tmpfile ; If (!$users){Write-Host "An error has occured. Members will not be added to the group." -F Red;Pause;Exit}}
""
##############################################################################################################################################################
# Actions
##############################################################################################################################################################

Foreach ($user in $users)
{
Remove-Variable rm* -Force
$rmuser = ($user.ToUpper()).Trim()
$rmuser = $sam.Replace("@[DOMAIN]","")

    If ($(try {Get-ADUser $rmuser} catch {$null}))
    {
    $rmext6 = (Get-ADUser $rmuser -Properties extensionAttribute6).extensionAttribute6                
    $rmtest1 = Get-MsolUser -UserPrincipalName "$rmuser@[DOMAIN]" -ReturnDeletedUsers
    $rmtest2 = Get-MsolUser -UserPrincipalName "$rmuser@[DOMAIN]"
    $rmtest3 = Get-MsolUser -HasErrorsOnly -SearchString "$rmuser@[DOMAIN]"

        If (!$rmtest1 -and !$rmtest2 -or $rmtest3)
        {
        Disable-Mailbox -Identity $rmuser -Confirm:$false -DomainController $pdc
        Disable-RemoteMailbox -Identity $rmuser -Confirm:$false -DomainController $pdc
        Enable-RemoteMailbox -Identity $rmuser -RemoteRoutingAddress "$rmuser@[EXTERNAL DOMAIN]" -DomainController $pdc > $null
        Write-Host "Remote mailbox enabled for $rmuser." -F Green      
        }
        Else
        {
        Write-Host "Mailbox already active for $rmuser." -F Yellow    
        }

        If (!$rmext6){$rmext6 = "365GS,365EN"}
        If ($rmext6 -notlike "*365GS*"){$rmext6 = $rmext6 + ",365GS"}
        If ($rmext6 -notlike "*365EN*"){$rmext6 = $rmext6 + ",365EN"}
        $rmext6 = $rmext6 -replace " ",""
        Set-ADUser $rmuser -replace @{"extensionAttribute6"=$rmext6}     
    }
    Else {Write-Host "$rmuser not found in Active Directory." -F Red}
}

"";"";""

Write-Host "----------------------------------------------------------------------------------------------------------------" -F Green
Write-Host "Complete........." -F Green
Write-Host "----------------------------------------------------------------------------------------------------------------" -F Green

##############################################################################################################################################################
# End                     
##############################################################################################################################################################

Remove-Item $tmpfile -Recurse ; Get-PSSession | Remove-PSSession;Pause;Exit