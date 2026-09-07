param(
    [string]$FilePath,
    [Parameter(Mandatory = $true)][string]$CertificateThumbprint,
    [Parameter(Mandatory = $true)][string]$TimestampUrl,
    [ValidateSet('CurrentUser', 'LocalMachine')][string]$CertificateStore = 'CurrentUser',
    [switch]$ValidateOnly
)

$ErrorActionPreference = 'Stop'
$thumbprint = $CertificateThumbprint.Replace(' ', '').ToUpperInvariant()
if ($thumbprint -notmatch '^[A-F0-9]{40}$') { throw 'A valid signing-certificate thumbprint is required.' }
$timestamp = $null
if (![Uri]::TryCreate($TimestampUrl, [UriKind]::Absolute, [ref]$timestamp) -or
    $timestamp.Scheme -ne 'https' -or $timestamp.UserInfo) {
    throw 'Provide the signing provider HTTPS RFC 3161 timestamp URL.'
}
if (!$ValidateOnly) {
    if ([string]::IsNullOrWhiteSpace($FilePath)) { throw 'Select the exact release executable to sign.' }
    $target = (Resolve-Path -LiteralPath $FilePath).Path
    if ([IO.Path]::GetExtension($target) -ne '.exe') { throw 'Only the explicitly selected release executable can be signed.' }
}
$certificate = Get-Item -LiteralPath "Cert:\$CertificateStore\My\$thumbprint" -ErrorAction Stop
if (!$certificate.HasPrivateKey -or $certificate.NotAfter -le (Get-Date) -or $certificate.NotBefore -gt (Get-Date) -or
    !($certificate.EnhancedKeyUsageList.ObjectId.Value -contains '1.3.6.1.5.5.7.3.3')) {
    throw 'The selected certificate must have an accessible private key and be valid for code signing.'
}
$tool = Get-Command signtool.exe -ErrorAction SilentlyContinue
$signToolPath = if ($tool) { $tool.Source } else {
    Get-ChildItem -Path "${env:ProgramFiles(x86)}\Windows Kits\10\bin\*\x64\signtool.exe" -ErrorAction SilentlyContinue |
        Sort-Object FullName -Descending | Select-Object -First 1 -ExpandProperty FullName
}
if (!$signToolPath) { throw 'Install the Windows SDK signing tools before requesting a signed release.' }
if ($ValidateOnly) { Write-Host 'Signing certificate and tools are ready. No file was changed.'; return }

$signArguments = @('sign', '/sha1', $thumbprint, '/s', 'My', '/fd', 'SHA256', '/tr', $timestamp.AbsoluteUri, '/td', 'SHA256')
if ($CertificateStore -eq 'LocalMachine') { $signArguments += '/sm' }
$signArguments += $target
& $signToolPath @signArguments
if ($LASTEXITCODE -ne 0) { throw 'Code signing or timestamping failed. Do not publish this build.' }
& $signToolPath verify /pa /all $target
if ($LASTEXITCODE -ne 0) { throw 'The signed release file failed Authenticode verification.' }
$signature = Get-AuthenticodeSignature -LiteralPath $target
if ($signature.Status -ne 'Valid' -or $signature.SignerCertificate.Thumbprint -ne $thumbprint -or !$signature.TimeStamperCertificate) {
    throw 'The release must have a valid signature from the selected publisher and a trusted timestamp.'
}
Write-Host "Signed and verified: $([IO.Path]::GetFileName($target))"
