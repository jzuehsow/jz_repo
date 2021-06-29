<###############################################################################################################################

Created by: Jeremy Zuehsow

Summary: Import a CSV of all attributes and sync with AD

###############################################################################################################################>


Set-Location $PSScriptRoot
.".\Config\Common.ps1"
$version = '1.0'

Start_Script


<###############################################################################################################################

###############################################################################################################################>


# Separate attributes to sync with a comma Example: "Department,Title,Office"
$attributes = "Department"
$maxchanges = 100 #PERFORM A WHATIF INSTEAD?
$REDpath = "[RED EXPORT CSV]"
$date = Get-Date -Format MM-dd-yy-HHmm
$log = "[ATTRIBUTE LOGS PATH]\$date.csv"
$notifyaddress = "[]"


# Checks if specified attributes are valid
$attributes = $attributes.Split(",");$badattrib = $null;$failed = $false;$errorexists = $null
$header = Get-Content -Path $REDPath -TotalCount 1
Foreach ($attribute in $attributes){If ($header -notlike "*$attribute*"){$failed = $true}}
If ($failed -eq $false){
    Foreach ($attribute in $attributes){Get-ADUser -Filter * -ResultSetSize 1 -Properties $attribute -ErrorVariable errorexists  > $null
    If ($errorexists){$failed = $true}}
}

# Function to log changes
Function changelog {
$hash =[pscustomobject]@{SamAccountName = $rmuser;EmployeeID = $rmeid;Attribute = $attribute;PreChange = $GREENValue;PostChange = $REDvalue}
$hash | export-csv $log -NoTypeInformation -Append;$hash = @{}
}

If ($failed -eq $false)
{
$RED = Import-Csv $REDpath;$RED = $RED | Where {$_.EmployeeID -like "?????????" -or $_.EmployeeNumber -like "?????????" -and $_.DistinguishedName -notlike "*archive*"}

    Foreach ($line in $RED)
    {
        Remove-Variable rm* -Force       
        If ($line.EmployeeID -like "?????????"){$rmeid = $line.EmployeeID;$rmuser = (Get-ADUser -Filter {EmployeeID -eq $rmeid} | Where {$_.Enabled -eq $true}).SamAccountName}
        Else{$rmeid = $line.EmployeeNumber;$rmuser = (Get-ADUser -Filter {EmployeeNumber -eq $rmeid} | Where {$_.Enabled -eq $true}).SamAccountName}

        If ($rmuser.Count -eq 1)
        {
            Foreach ($attribute in $attributes)
            {
            $GREENValue = $null;$REDvalue = $null
            $GREENValue = (Get-ADUser $rmuser -Properties $attribute).$attribute
            $REDvalue = "`$line." +  $attribute;$REDvalue = Invoke-Expression $REDvalue
            
                If ($attribute -eq "DisplayName")
                {
                    If ($REDvalue){
                    $rmlower = ($REDvalue.Split("(")[0]).ToLower()
                    $rmfixed = (Get-Culture).TextInfo.ToTitleCase($rmlower)
                    $REDvalue = $REDvalue -Replace "$rmlower","$rmfixed"
                    $REDvalue = $REDvalue -replace "ii","II" -replace "iii","III" -replace "iv","IV"}
                }
                $command1 = "Set-ADUser $rmuser -Clear $attribute";$command2 = "Set-ADUser $rmuser -$attribute `"$REDvalue`""            
                If (!$REDvalue -and $GREENValue){Invoke-Expression $command1;changelog;$i++}
                ElseIf ($GREENvalue -ne $REDvalue -and $REDvalue){Invoke-Expression $command2;changelog;$i++}
            }
        }

    If ($i -gt $maxchanges){Send-MailMessage -From $notifyaddress -To $notifyaddress -Subject "*** Attribute Sync Error ***" `
    -Body "The attribute sync task has exceeded $maxchanges changes and has been stopped." -SmtpServer smtp.GREEN.gov;Exit}
    }
}
If ($failed -eq $true){Send-MailMessage -From $notifyaddress -To $notifyaddress -Subject "*** Attribute Sync Error ***" `
-Body "The attribute sync contains an invalid attribute and has been stopped." -SmtpServer smtp.GREEN.gov;Exit}