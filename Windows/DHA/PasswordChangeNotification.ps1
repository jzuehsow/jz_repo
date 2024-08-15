<#############################################################################################################################################################

Author:      Jeremy Zuehsow
Purpose:     This script notifies and sends half the password to the user and Security Officer that the user's password has changed.


Created:     07/01/2019

#############################################################################################################################################################>


."\\[PATH]\Config\Common.ps1"
$version = '2.0'

Start_Script
Write_Banner

$attach = "\\[PATH]Input\NameChange_Communication-Final.docx"
$adSMBX = '[ALERT MAILBOX]'
$eocMBX = '[HELPDESK MAILBOX]'
$itsMBX = '[LOCAL SUPPORT MAILBOX]'
$csvPath = "[PATH]\Input\SCINET_Names"

Write-Host "What is the target date and time of the name change?" -F Yellow
Do
{
	Do {$rmDate = Read-Host "`nTarget Month/Day"}
	Until (Get-Date $rmDate)
	Do {$rmTime = Read-Host "`nTarget Time"}
	Until (Get-Date $rmTime)
	$targetDate = Get-Date (Get-Date ($rmDate)).AddHours((Get-Date $rmTime –FormatHH)) -Format F
	Write-Host "`nTarget date and time for name change: " -NoNewLine; Write-Host $targetDate –F Yellow
	$continue = Read-Host "`nIs this correct (Y/N)";"`n"
    Remove-Variable rm* -Force
}
Until ($continue –eq 'Y')

Do
{
	Remove-Variable rm* -Force
	$listCSVs = (Get-ChildItem $csvPath).Name | ? {$_ -like "*.csv"} | Sort
	$I = 0; $list = @()
	ForEach ($rmCSV in $listCSVs)
	{
		$I++; Write-Host "`t$I`t$rmCSV" -F Yellow
		New-Variable rmCSV$I –Value $rmCSV
	}
	$rmSelect = Read-Host "`nSelect CSV file to import [1-$I]"
	$csv = Get-Variable rmCSV$rmSelect -ValueOnly
	If ((Test-Path "$csvPath\$csv") -and ("$csvPath\$csv" -ne "$csvPath\"))
	{
		$list = Import-Csv "$csvPath\$csv"
		If ($list.Count -eq 0) {Write-Host "$csv is empty." -F Red; $list = @()}
		Else {Write-Host "Importing $csv..." -F Green}
	}
	Else {Write-Host "File Not Found." -F Red}
	"`n"
}
Until ($list)

ForEach ($line in $list)
{
	Remove-Variable rm* -Force
	$rmName = (Get-Culture).TextInfo.ToTitleCase(($line.UpliftGivenName+" "+$line.UpliftSurname).ToLower())
	$rmREDam = ($line.SamAccountName).ToUpper()
	$rmYELLOWSam = ($line.UpliftSamAccountName).ToUpper()
	$rmEID = $line.EID
	$rmEmail = (Get-ADUser –Filter {EmployeeID –like $rmEID} -Properties EmailAddress).EmailAddress
	
	$rmSubject = "Mandatory Name Change Notification - $rmName"
	$rmBody = &{
	
	[string]("<font face=Calibri>
	Good Morning $rmName,
	
	<p><font color=Red>
		Your <b><u>Uplift </b></u> username will change from <b><u>$rmUpSam</b></u> to <b><u>$rmSam</b></u> on <b><u>$targetDate</b></u>.
		<br><br>
		<b>***Mozilla Firefox Bookmarks***</b>
		<br>
		<li>Backup your Firefox bookmarks to your H:\.
		<li>Open Mobilla > Select the Bookmarks menu > Choose Show All Bookmarks > Select Import and Backup button > Choose Backup > save a copy of your bookmarks to your H:\ drive.
		<br><br>
		<b>Please reboot your computer prior to the time above.</b>
		<br><br>
		***If you need to reschedule, please contact the AD team member Cc'd on this email ASAP***
	</p></font>
	
	<p>
		As part of an ongoing Information Technology modernization initiative, ICAM has identified a number of employees using multiple usernames to access the following networks/enclaves: `
		RED, GREEN, YELLOW, and/or BLACK. Your YELLOW logon name was recently flagged as different from your RED and GREEN logon accounts, and needs to be updated. `
		ICAM is directed to modify your YELLOW logon account name to ensure the name matches your RED and GREEN accounts, and below provides insight into this process.
	</p>
	
	<p><font color=Red>*** Important notes regarding your SCINET name change remediation process ***</font></p>
	
		<b>General Information:</b>
		<font face = arial size=2.75>
		<li>[COMPANY]] usernames are based on the official name as listed in the [COMPANY]'s Human Resources systems.
			<ul><I>These systems include the Bureau Personnel Management System (BPMS), HR Source, and the Facility Security System (FSS).</i></ul>
		<li>UNET and YELLOW should follow RED username convention for all network accounts.
			<ul><I>It is important these accounts match for accurate identity, account conflict avoidance, and to ensure all users have the same username on all enclaves for cross domain automation.</i></ul>
		</font>
		
		<br>
		
		<b>YELLOW Name Change Information:</b>
		<font face=arial size=2.75>
		<li>Your password will not change!
		<li>You must have your PKI certificates updated.
		
		<li>Your updated logon name may take up to 5 days (120 hours) to replicate throughout the Intelligence Community (IC) systems.
		<li>Some IC sites may require you to re-register your account.
		<li>You will retain your former email address for 90 days in order to allow you sufficient time to notify external contacts of your new email address.
		<li>ICAM is contructing automated solutions to standardize naming convention in support of the [COMPANY] enterprise.
		</font>
	
	<fontcolor=Red>
		<p>You will need to coordinate with the Headquarters PKI representative and ITS.</p>
		
		<p>Attached for your awareness and record is the approved management communication concerning this project.</p>
	</font>
	
	<p>Contact Headquarters ITS and/or the AD team ifyou have any questions.</p>
	
	<p>
		<br><br>
		Thank you,
		<br><br>
		Active Directory Team
	</p>
	")}
	
	Write-Host "`nSending email to " -NoNewLine
	Write-Host $rmName –F Yellow -NoNewLine
	Write-Host " at " -NoNewLine
	Write-Host " to change YELLOW name from " -NoNewLine
	Write-Host $rmUpSam –F Yellow -NoNewLine
	Write-Host " to " -NoNewLine
	Write-Host $rmSam –F Yellow -NoNewLine
	Send-MailMessage –To $rmEmail –Cc $regEmail –From $adSMBX –Subject $rmSubject –BodyAsHtml $rmBody –Attachments $attach –SmtpServer $smtp
}

#NOTIFY ITS OF USERS TO HAVE THEIR NAME CHANGED
$rmSubject2 = "YELLOW Name Change List for $targetDate"
$rmBody2 = "
Attached is a list of usernames scheduled to be changed $targetDate.

These users are expected to require assistance removing their local profiles.
"
Send-MailMessage –To $itsMBX –Cc $regEmail –From $adSMBX –Subject $rmSubect2 –Body $rmBody2 –Attachments "$csvPath\$csv" -SmtpServer $smtp
