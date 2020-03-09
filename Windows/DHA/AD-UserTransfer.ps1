




################################################################################################################################
<# Created by Taylor S Perry, IMSU, 2/24/17
The purpose of this script is to autmote user transfers.
Updated - UNET verbage, and CanonicalName - Eli 7/31/17a
Added loop for multiple users - 10/10/17


#>
################################################################################################################################    

$version = "1.0"
$banner = "
----------------------------------------------------------------------------------------------------------------------
----------------------------------------------------------------------------------------------------------------------                                                                                                                     

                                      User Transfer Script - Version $version
                                                                                                                                                                              
----------------------------------------------------------------------------------------------------------------------
----------------------------------------------------------------------------------------------------------------------




"
$pshost = get-host;$pswindow = $pshost.UI.RawUI;$newsize = $pswindow.BufferSize
$newsize.Height = 65;$newsize.Width = 120;$pswindow.BufferSize = $newsize

$pdc = Get-ADDomain | Select-Object PDCEmulator
$pdc = $pdc.PDCEmulator
$PSDefaultParameterValues = @{"*-AD*:Server"="$pdc"}

$rmadm = $env:username
$rmsvr = $env:COMPUTERNAME
$rmgptest = Get-ADPrincipalGroupMembership $rmadm | select name | where {$_.name -like "*Administrators_MDSU*"}
$rmwid=[System.Security.Principal.WindowsIdentity]::GetCurrent()
$rmprp=new-object System.Security.Principal.WindowsPrincipal($rmwid)
$rmadm=[System.Security.Principal.WindowsBuiltInRole]::Administrator
$rmisadm = $rmprp.IsInRole($rmadm)

Clear-Host;$banner
If (!$rmgptest){Write-Host "Only members of MDSU administrative groups are allowed to run this script." -F Red;Pause;Exit}
#If ("HQCK-UADMN-401" -ne $rmsvr){Write-Host "As a breakfix, the provisioning script must be ran from HQCK-UADMN-401." -F Red;Pause;Exit}
If ($rmisadm -eq $false){Write-Host "Powershell not running as administrator." -F Red;Pause;Exit}

$date = Get-Date -Format MM/dd/yy

Do # Script loop. "Until" at end of script
{
Remove-Variable rm* -Force
Clear-Host;$banner
################################################################################################################################
# Input
################################################################################################################################

Do
{
$rmticket = Read-Host "Enter the ticket number"
    If ($rmticket -notlike "????*"){Write-Host "Invalid ticket number." -F Red}
}
Until ($rmticket -like "????*")
$rmticket = $rmticket.ToUpper()

""
Do
{
$rmuser = Read-Host "Enter the username of the account being transferred"
$rmuser = $rmuser.toupper()
    If (!($(try {Get-ADUser $rmuser} catch {$null}))){Write-Host "Invalid username." -F Red}
}
Until ($(try {Get-ADUser $rmuser} catch {$null}))
Set-ADUser $rmuser -Enabled $true

""
Do
{
$rmoffice = Read-Host "Enter the New Division/Field Office from the EPAS request"
$rmoffice = $rmoffice.toupper()
    
    If (!($rmoffice)) {Write-Host "You must enter the new office. This is listed in the SAR." -F Red}
}
Until ($rmoffice)

################################################################################################################################
# OU Determination
################################################################################################################################

""
Write-Host "Enter the OU name where the account is being transferred too." -F Green
Write-Host "This will be the site code or division. Example: LAHQ, DLHQ, Div20, Div00, ect."  -F Green

""
Do{
    Do
    {
    $rmnewou = Read-Host "Enter the OU name"
        If ($rmnewou -notlike "????" -and $rmnewou -notlike "div*")
        {
        Write-Host "Invalid entry." -F Red
        }
        If ($rmnewou -eq "HQHQ")
        {
        Write-Host "For HQHQ transfers, enter the division in the format DIV20, DIV13, ect." -F Red
        }
    }
    Until ($rmnewou -ne "HQHQ" -and $rmnewou -like "????" -or $rmnewou -like "div*")

    If ($rmnewou -eq "HQCK") {$rmnewou = "CKHQ"}
    If ($rmnewou -eq "div22") {$rmnewou = "hqir"}
    If ($rmnewou -eq "div02") {$rmnewou = "hqta"}
    
    "";Write-Host "Determining transfer location. This can take a minute." -F Yellow;""

    $rmalldn = @() 
    $ous = (Get-ADOrganizationalUnit -Filter {Name -eq $rmnewou}).DistinguishedName
  
        Foreach ($ou in $ous)
        {
        $rmus = Get-ADUser -Filter * -SearchBase $ou | Where {$_.DistinguishedName -like "*Endusers*" -or $_.DistinguishedName -like "*LEGAT*"}
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

    $rmoucon = ($(try {(Get-ADOrganizationalUnit $rmou -Properties CanonicalName).CanonicalName.toupper()} catch {$null}))
    If ($rmoucon) {$rmoucon = $rmoucon.Replace("FBI.GOV/","")}

    $rmoldcon = (Get-ADUser $rmuser -Properties CanonicalName).CanonicalName
    $rmoldcon = ($rmoldcon -replace "/$rmuser","").toupper()
    $rmoldcon = $rmoldcon.Replace("FBI.GOV/","")
If (!$rmoucon){Write-Host "Unable to determine transfer location based on the info entered. Please ensure it exists in AD." -F Red}
}
Until ($rmoucon)

################################################################################################################################
# Console output
################################################################################################################################

"";""
Write-Host "The script has determined the user should be transferred to the following location." -F Green;"";""
Write-Host "New OU:  " -F Green -NoNewline; Write-Host $rmoucon -F Magenta;"";""

Do
{
$rmaccept = Read-Host "Is this correct? (Y/N)"
}
Until ($rmaccept -eq "Y" -or $rmaccept -eq "N")

If ($rmaccept -eq "N") 
{
    Do
    {
    $rmou = Read-Host "Enter the distinguished name for the OU"
    }
    Until ($(try {Get-ADOrganizationalUnit $rmou} catch {$null}))
}


If ($rmou)
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

$rmolddiv = (((Get-ADUser $rmuser -Properties DisplayName).DisplayName).split("(")[1]).replace(")","").replace(" ","")
If ($rmolddiv) {$rmnewdis = ((Get-ADUser $rmuser -Properties DisplayName).DisplayName).replace("$rmolddiv","$rmdiv")}
}

$rmname = (Get-ADUser $rmuser -Properties Name).Name
If ($rmname -like "*(*") 
{
$rmname = $rmname.Split("(")[0]
Get-aduser $rmuser | Rename-ADObject -NewName $rmname
}

$rminfo = (Get-ADUser $rmuser -Properties Info).info

$rmtelephonetab = "Ticket#: $rmticket
Transferred to: $rmoucon
Transferred by: $rmadm
Date:  $date
*******************************************
$rminfo"

Get-ADUser $rmuser | Move-ADObject -TargetPath $rmou -ErrorAction SilentlyContinue -WarningAction SilentlyContinue
Set-ADUser $rmuser -Replace @{info=$rmtelephonetab}
Set-ADUser $rmuser -Description $null -Office $rmoffice

# removed following "-Title $null -Department $null -Company $null" we need to rewrite company to match this format (ITID CON) similar as "$rmdiv"

If ($rmnewdis){Set-ADUser $rmuser -DisplayName $rmnewdis}

###################################################################################################################################################################
# Muptiple account loop
###################################################################################################################################################################
""
Do{
$another = Read-Host "Would you like to transfer another user? (Y/N)"
    If ($another -ne "Y" -and $another -ne "N"){Write-Host "Invalid selection." -F Red}
}
Until ($another -eq "Y" -or $another -eq "N")
}
Until ($another -eq "N") # "Do" at beginning of script

############################################################################################################################
###  End
############################################################################################################################
"";"";""
Write-Host "----------------------------------------------------------------------------------------------------------------" -F Yellow
Write-Host "User Transfer. Finalization Complete........." -F Yellow
Write-Host "----------------------------------------------------------------------------------------------------------------" -F Yellow
""
Remove-Variable rm* -Force
Pause