



# Separate attributes to sync with a comma Example: "Department,Title,Office"
$attributes = "Department"

# Set variable to $true for logging only. Set to $false to allow changes.
$logonly = $false

# Path to CSV file containing attributes to sync.
$REDpath = "[RED EXPORT CSV]"

$date = Get-Date -Format MM-dd-yy
$log = "[ATTRIBUTE SYNC LOGS]\$date.csv"

# Checks if specified attributes are valid
$attributes = $attributes.Split(",");$badattrib = $null
$header = Get-Content -Path $fbinetpath -TotalCount 1
Foreach ($attribute in $attributes){If ($header -notlike "*$attribute*"){Write-Host "The input file $fbinetpath does not contain an attribute that matches $attribute." -F Red;Pause;Exit}}
Foreach ($attribute in $attributes){Get-ADUser -Filter * -ResultSetSize 1 -Properties $attribute -ErrorVariable badattrib  > $null;If ($badattrib){Pause;Exit}}
If ($logonly -ne $true -and $logonly -ne $false){Write-Host "The log only variable must be set as True or False." -F Red;Pause;Exit}

If ($logonly -eq $false){Write-Host "The logonly variable is set to false. Continuing will update attributes `"$attributes`" with values from the CSV input file:" -F Yellow
Write-Host $fbinetpath -F Yellow;Do{$accept = Read-Host "Do you wish to continue? Y/N"}Until ($accept -eq "Y" -or $accept -eq "N")};If ($accept -eq "N"){Pause;Exit}

# Function to log changes
Function changelog {
$hash =[pscustomobject]@{LogOnly = $logonly;SamAccountName = $rmuser;EmployeeID = $rmeid;Attribute = $attribute;PreChange = $unetvalue;PostChange = $fbinetvalue}
$hash | export-csv $log -NoTypeInformation -Append;$hash = @{}
}

# Imports FBINET CSV 
Write-Host "Importing and filtering CSV. This can take a while..." -F Green
$RED = Import-Csv $REDpath;$RED = $RED | Where {$_.EmployeeID -like "?????????" -or $_.EmployeeNumber -like "?????????" -and $_.DistinguishedName -notlike "*archive*"}
$i = 1;$csvcount = $RED.count;Clear-Host
Foreach ($line in $RED)
{
$percent = ((($i / $csvcount) * 100)).ToString("#.#")
Write-Progress -Activity " $percent percent complete" -PercentComplete $percent;$i++
    Remove-Variable rm* -Force       
    If ($line.EmployeeID -like "?????????"){$rmeid = $line.EmployeeID;$rmuser = (Get-ADUser -Filter {EmployeeID -eq $rmeid} | Where {$_.Enabled -eq $true}).SamAccountName}
    Else{$rmeid = $line.EmployeeNumber;$rmuser = (Get-ADUser -Filter {EmployeeNumber -eq $rmeid} | Where {$_.Enabled -eq $true}).SamAccountName}

    If ($rmuser.Count -eq 1)
    {
        Foreach ($attribute in $attributes)
        {
        $unetvalue = $null;$REDvalue = $null
        $unetvalue = (Get-ADUser $rmuser -Properties $attribute).$attribute
        $REDvalue = "`$line." +  $attribute;$fbinetvalue = Invoke-Expression $fbinetvalue
            
            If ($attribute -eq "DisplayName")
            {
                If ($REDvalue){
                $rmlower = ($REDvalue.Split("(")[0]).ToLower()
                $rmfixed = (Get-Culture).TextInfo.ToTitleCase($rmlower)
                $REDvalue = $REDvalue -Replace "$rmlower","$rmfixed"
                $REDvalue = $REDvalue -replace "ii","II" -replace "iii","III" -replace "iv","IV"}
            }
            $command1 = "Set-ADUser $rmuser -Clear $attribute";$command2 = "Set-ADUser $rmuser -$attribute `"$REDvalue`""            
            If (!$REDvalue -and $unetvalue){If($logonly -eq $false){Invoke-Expression $command1};changelog}
            ElseIf ($unetvalue -ne $REDvalue -and $REDvalue){If($logonly -eq $false){Invoke-Expression $command2};changelog}
        }
    }
}