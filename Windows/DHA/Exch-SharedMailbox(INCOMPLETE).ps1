<#############################################################################################################################################################

Team:        ICAM Active Directory Engineering and Operations
Author:      Jeremy Zuehsow
Purpose:     This script creates a shared mailbox, notifies the user, and provides instructions.


Created:     07/01/2019

Change Log: v1.1 Added functions for monitoring servers and checking load balancers.
            v1.2 Modified monitoring function to manually check a certain number of times

#############################################################################################################################################################>


."[PATH]]\Config\Common.ps1"

$mbxOU = "[SHARED MAILBOX OU]"
$sgsmOU = "OU=SGSM,$mbxOU" #CAN ALSO BE WRITTEN ABSOLUTE
$guide = "[HOW TO USER GUIDE]"
$version = '3.0'

Start_Script
Write_banner
Test_RanAsAdmin
New_ExchangeSession

If (!(Test-Path $guide))
{
        Write-Host "Could not find the user guide located at: $guide" -F Red
        $continue = Read-Host "Enter 'Y' to Continue"
        If ($continue -ne 'Y') {Pause; Exit}
}


##############################################################################################################################################################
# Enter Ticket Info
##############################################################################################################################################################

Enter_TicketInfo

Do
{
	Do
	{
        $pass = $true
        $mbxName = Read-Host "`nEnter the desired shared mailbox name"
			
        If ($mbxName –like "*@*")
        {
            Do
            {
				Write-Host "`nEnter only the mailbox name. Do not include domain (e.g. @FBI.SGOV.GOV)." -F Red
				$mbxNameTemp = $mbxName.Substring(0,$mbxName.IndexOf('@'))
				Write-Host "`nThe new mailbox name is: " -NoNewline; Write-Host $mbxNameTemp –F Magenta
				If ((Read-Host "`nAccept new mailbox name (Y/N)") -eq 'Y') {$mbxName = $mbxNameTemp; Break}
				Else {$pass = $false; Break; Continue}
            }
            Until ($mbxName –notlike "*@*")
        }
			
        If ($mbxName –like "* *")
        {
            Do
            {
                Write-Host "`nThe mailbox name cannot contain spaces." -F Red
                $mbxNameTemp1 = $mbxName.TrimEnd() -replace " "
                $mbxNameTemp2 = $mbxName.TrimEnd() -replace " ","."
                $mbxNameTemp3 = $mbxName.TrimEnd() -replace " ","-"
                $mbxNameTemp4 = $mbxName.TrimEnd() -replace " ","_"
					
                Write-Host "`nWould you like to replace spaces with one of the options below?`n
                1) $mbxnameTemp1
                2) $mbxNameTemp2
                3) $mbxNameTemp3
                4) $mbxNameTemp4
                5) None of the above"
					
                Do {$select = Read-Host "`nSelect Option"}
                Until ($select –ge '1' -and $select -le '5')
					
                If ($select –eq '1') {$mbxName = $mbxNameTemp1}
                If ($select –eq '2') {$mbxName = $mbxNameTemp2}
                If ($select –eq '3') {$mbxName = $mbxNameTemp3}
                If ($select –eq '4') {$mbxName = $mbxNameTemp4}
                If ($select –eq '5') {$pass = $false; Break; Continue}
            }
            Until ($mbxName –notlike "* *")
        }
			
        If ($mbxName.length -gt 20) {Write-Host "`nThe mailbox name must be 20 characters or less." -F Red; $pass = $false}
        If (Get-ADGroup $mbxName –Server $pdc) {Write-Host "`n$mbxName is the name of an existing security group." -F Red; $pass = $false}
        If (Get-ADUser $mbxName –Server $pdc) {Write-Host "`n$mbxName is the name of an existing user." -F Red; $pass = $false}
        If (Get-Mailbox $mbxName –DomainController $pdc) {Write-Host "`n$mbxName is the name of an existing mailbox." -F Red; $pass = $false}
	}
	Until ($pass)
	
	Do
	{
		$sgsmName = "SGSM_$mbxName"
		If (Get-ADGroup $sgsmName –Server $pdc)
		{
			Write-Host "`nSecurity group $sgsmName already exists." -F Red
			Do
			{
				$continue = Read-Host "`nWould you like to link the existing group (Y/N)"
				If ($continue –eq 'Y') {Break}
			}
			Until ($continue –eq 'N')
            
            Write-Host "`nSGSM name must match mailbox name. Please choose a different mailbox name." -F Red
			$pass = $false; Break
		}
	}
	Until ($pass)
}
Until ($mbxName -and $sgsmName)


##############################################################################################################################################################
# Self Check (OPTIONAL)
##############################################################################################################################################################

Do
{
	$addSelf = Read-Host "`nAdd your user account to test the shared mailbox (Y/N)"
	If (($addSelf –ne 'Y') -and ($addSelf –ne 'N')) {$addSelf = $null; Write-Host "`nInvalid response." -F Red}
}
Until ($addSelf)


##############################################################################################################################################################
# Create Mailbox
##############################################################################################################################################################

Write-Progress –Activity "Creating Shared Mailbox....." -PercentComplete 0
New-Mailbox –Name $mbxName –OrganizationalUnit $mbxOU –DisplayName $mbxName –UserPrincipalName "$mbxName@admin.fbi" -Alias $mbxName –Shared –DomainController $pdc | Out-Null
$i = 0
While (!(Get-mailbox $mbxname –DomainController $pdc) -and $i –le 10)
{
	Write-Progress –Activity "Creating Shared Mailbxox....." -PercentComplete ($i*2)
	Start-Sleep $i; $i++
}
If (!(get-Mailbox $mbxName –DomainController $pdc))
{
	Do
	{
		Write-Host "`nUnable to create shared mailbox." -F Red
		$wait = Read-Host "Would you like to wait an additional 60 secondsd (Y/N)"
		If ($wait -eq 'Y') {Start-Sleep 60}
		ElseIf ($wait –eq 'N') {Pause; Exit}
		Else {Write-Host "Please enter 'Y' or 'N' to continue." -F Red}
	}
	Until (get-ADUser $mbxname –Server $pdc)
}
Write-Progress –Activity "Creating Security Group....." -PercentComplete 20


##############################################################################################################################################################
# Create Security Group
##############################################################################################################################################################


