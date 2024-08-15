




$date = Get-Date -Format yyyy-MM-dd-HHmm


Trap [Exception]
	{
		 $Script:ExceptionMessage = $_
		 $Error.Clear()
		 continue
	}

$FormatEnumerationLimit = -1
$TrustsOutput = "[LOG PATH]]\Trust Topology\Trust Topology-$date.txt"

#Get number of forest trusts
$ForestInfo = [System.DirectoryServices.ActiveDirectory.Forest]::GetCurrentForest()
$ForestTrusts = $ForestInfo.GetAllTrustRelationships()
$ForestTrustCount = $ForestTrusts.count

#Get number of external trusts
$DomainInfo = [System.DirectoryServices.ActiveDirectory.Domain]::GetCurrentDomain()
$ExternalTrusts = $DomainInfo.GetAllTrustRelationships()
$ExternalTrustsCount = $ExternalTrusts.count

#Get number of internal trusts
$ForestInfo = [System.DirectoryServices.ActiveDirectory.Forest]::GetCurrentForest()
$InternalDomains = $ForestInfo.Domains
$InternalTrusts = @()
foreach ($Sibling in $InternalDomains)
	{
	if ($Sibling.Name -ne $DomainInfo.Name)
		{$InternalTrusts += $Sibling.Name}
	}
$InternalTrustsCount = $InternalTrusts.count
$AllTrustsCount = $InternalTrustsCount + $ForestTrustCount + $ExternalTrustsCount
$AllTrusts = $AllTrustsCount

if ($AllTrusts -ge 60)
	{
	$EstimatedTime = New-TimeSpan -seconds $AllTrusts
	$Minutes = $EstimatedTime.minutes
	$Seconds = $EstimatedTime.seconds
	}
	else
		{
		$Minutes = 0
		$Seconds = $Alltrusts
		} 
#Give an estimate of how many trusts are being checked to the engineer/user.
$LocalDomain = $DomainInfo.name
$Date = Get-date
"Trust topology information obtained from the computer $env:COMPUTERNAME in the domain $LocalDomain on $Date. " | Out-File $TrustsOutput -encoding UTF8 
"This text file contains information on all trusts: Forest, External, Shortcut and ParentChild." | Out-File $TrustsOutput -encoding UTF8 -Append
"There are $ForestTrustCount forest trusts." | Out-File $TrustsOutput -encoding UTF8 -Append
"There are $InternalTrustsCount internal (intra forest) trusts." | Out-File $TrustsOutput -encoding UTF8 -Append
"There are $ExternalTrustsCount external trusts." | Out-File $TrustsOutput -encoding UTF8 -Append
"**********************************************************************************************" | Out-File $TrustsOutput -encoding UTF8 -Append
Write-Host "Trust data collection from the domain $LocalDomainName is expected to take approximately $Minutes minute(s) and $seconds seconds." -BackgroundColor Green
Write-Host "Working..." -BackgroundColor Green

function CheckTrusts { [CmdletBinding()]
Param(
   [Parameter(Mandatory=$True,Position=1)]
   [string]$Type
	)
	switch -regex ($Type)
		{	"forest" {
					$ForestInfo = [System.DirectoryServices.ActiveDirectory.Forest]::GetCurrentForest()
					$Trusts = $ForestInfo.GetAllTrustRelationships()
					$Domains = $ForestInfo.Domains
					$CurrentDomain= [System.DirectoryServices.ActiveDirectory.Domain]::GetCurrentDomain()
					#$CurrentDomainString = $CurrentDomain.name.ToString()
					$ForestString = $ForestInfo.Name.ToString()
					$ContextType = [System.DirectoryServices.ActiveDirectory.DirectoryContextType]::Forest
					$DirContext = New-Object System.DirectoryServices.ActiveDirectory.DirectoryContext($ContextType,$ForestString)
					$Forest = [System.DirectoryServices.ActiveDirectory.Forest]::GetForest($DirContext)
					}
			"internal" {
					$DomainInfo = [System.DirectoryServices.ActiveDirectory.Domain]::GetCurrentDomain()
					$DomainString = $DomainInfo.Name.ToString()
					$ForestInfo = [System.DirectoryServices.ActiveDirectory.Forest]::GetCurrentForest()
					$InternalDomains = $ForestInfo.Domains
					$Trusts = @()
					foreach ($Sibling in $InternalDomains)
						{
						if ($Sibling.Name -ne $DomainInfo.Name)
							{$Trusts += $Sibling.Name}
						}
					}
			"external"{
					$DomainInfo = [System.DirectoryServices.ActiveDirectory.Domain]::GetCurrentDomain()
					$Trusts = $DomainInfo.GetAllTrustRelationships()
					$DomainString = $DomainInfo.Name.ToString()
					$ContextType = [System.DirectoryServices.ActiveDirectory.DirectoryContextType]::Domain
					$DirContext = New-Object System.DirectoryServices.ActiveDirectory.DirectoryContext($ContextType,$DomainString)
					$Domain = [System.DirectoryServices.ActiveDirectory.Domain]::GetDomain($DirContext)
					}
			default{
					break
					}
				}
	
	"Active Directory Trusts for Trusts of Type $Type" | Out-File $TrustsOutput -Append -encoding UTF8
	"*********************************" | Out-File $TrustsOutput -Append -encoding UTF8
	foreach ($Trust in $Trusts)
		{
		if ($Type -eq 'Internal')
			{
			$Trust =  $DomainInfo.GetTrustRelationship($Trust)
			}
		if (($Trust.TrustDirection -eq 'inbound') -or ($Trust.TrustDirection -eq 'bidirectional'))
			{
			$Targetname = $Trust.TargetName.ToString()
			#Check to see if the trust has Quarantine (ie SIDFiltering) enabled.
			Try {
				if (($Type -match 'internal') -or ($Type -match 'external'))
					{
					$SidFilteringStatus = $DomainInfo.GetSidFilteringStatus($TargetName)
					$SelectiveAuthStatus = $DomainInfo.GetSelectiveAuthenticationStatus($TargetName)
					}
				if ($Type -match 'forest')
					{
					$SidFilteringStatus = $ForestInfo.GetSidFilteringStatus($TargetName)
					$SelectiveAuthStatus = $ForestInfo.GetSelectiveAuthenticationStatus($TargetName)
					}		
				}
			Catch {
				$SidFilteringStatus = $_
				$SelectiveAuthStatus = $_
				}

		#Create PSObject to place the trust details into.
		$DomainTrustObject = New-Object PSObject	
		$TrustTitleString = 'Trust Details for ' + ($Trust.SourceName.ToString()) + '|' + ($Trust.TargetName.ToString())
	    add-member -inputobject $DomainTrustObject -membertype noteproperty -name "Trust Name" -value $TrustTitleString
	    add-member -inputobject $DomainTrustObject -membertype noteproperty -name "Local Domain (Source)" -value $Trust.SourceName
	    add-member -inputobject $DomainTrustObject -membertype noteproperty -name "Trusted Domain (Target)" -value $Trust.TargetName
	    add-member -inputobject $DomainTrustObject -membertype noteproperty -name "Trust Direction" -value $Trust.TrustDirection
	    add-member -inputobject $DomainTrustObject -membertype noteproperty -name "Trust Type" -value $Trust.TrustType
		if ($Trust.TrustType -eq 'Forest')
	    	{
			if ($Trust.TrustedDomainInformation -ne $null)
				{
				foreach ($TDI in $Trust.TrustedDomainInformation)
					{
					$TDIValue = 'DNSName ' + $TDI.DnsName + ' | ' + 'Domain SID: ' + $TDI.DomainSID 
					$TDIName = 'Trusted Domain Info: ' + $TDI.NetBIOSName
					add-Member -InputObject $DomainTrustObject -MemberType NoteProperty -Name $TDIName -Value $TDIValue
					}
				}
	   			else
				{add-Member -InputObject $DomainTrustObject -MemberType NoteProperty -Name 'Trusted Domain Information' -Value "None Defined"}
			if ($Trust.TopLevelNames -ne $null)
				{
				$TLNTable = @{}
				foreach ($TLN in $trust.TopLevelNames)
					{$TLNTable.Add($TLN.name,$TLN.Status)}
				add-Member -InputObject $DomainTrustObject -MemberType NoteProperty -Name 'Trust TopLevelNames (Name Suffix Routing)' -Value $TLNTable
				}
	   			else
				{add-Member -InputObject $DomainTrustObject -MemberType NoteProperty -Name 'Trust TopLevelNames (Name Suffix Routing)' -Value "None Defined"}
			if ($Trust.ExcludedTopLevelNames -ne $null)
				{
				$ETLNArray = @()
				foreach ($ELTN in $Trust.ExcludedTopLevelNames)
					{$ETLNArray += $ELTN}
				add-Member -InputObject $DomainTrustObject -MemberType NoteProperty -Name 'Trust Excluded TopLevelNames (Name Suffix Routing)' -Value $ETLNArray
				}
				else
				{add-Member -InputObject $DomainTrustObject -MemberType NoteProperty -Name 'Trust Excluded TopLevelNames(Name Suffix Routing)' -Value "None Defined"}
			}

	    add-member -inputobject $DomainTrustObject -membertype noteproperty -name "Quarantine (SIDFiltering)" -value $SidFilteringStatus
		add-member -inputobject $DomainTrustObject -membertype noteproperty -name "Selective Authentication" -value $SelectiveAuthStatus
		$DomainTrustObject | FL * | Out-File $TrustsOutput  -Append -encoding UTF8
		
		#Set values to $null for next trust check.
		$SidFilteringStatus = $null
		$InterForestTrustObject = $null
			}
		}
	}
	
CheckTrusts 'internal'
CheckTrusts 'forest'
CheckTrusts 'external'
Write-Host "Trust topology information collected. Results available in $TrustsOutput"