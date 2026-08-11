using System;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;
using System.Windows.Forms;

namespace BlackSpiritHub;

internal enum StartupSplashState
{
	Intro,
	Holding,
	Exiting,
	Error,
	Restoring,
	Hidden
}

internal sealed class StartupSplashWindow : Form
{
	internal const int PulseCycleDurationMilliseconds = 900;
	internal const int PulseCycleCount = 3;
	internal const int MinimumColdLaunchDurationMilliseconds = 2_700;
	internal const int ExitFadeDurationMilliseconds = 420;
	internal const int AnimationIntervalMilliseconds = 16;
	internal const int HoldingPollIntervalMilliseconds = 100;

	private const int WsExToolWindow = 0x00000080;
	private const int WsExNoActivate = 0x08000000;
	private const uint SpiGetClientAreaAnimation = 0x1042;
	private const uint TimerResolutionMilliseconds = 1;

	private static readonly Color BackgroundFallback = Color.FromArgb(4, 8, 16);
	private static readonly Color SpiritWellTop = Color.FromArgb(250, 8, 22, 31);
	private static readonly Color SpiritWellBottom = Color.FromArgb(252, 3, 10, 17);
	private static readonly Color Cyan = Color.FromArgb(66, 229, 233);
	private static readonly Color PaleCyan = Color.FromArgb(125, 211, 252);
	private static readonly Color PrimaryText = Color.FromArgb(234, 248, 250);
	private static readonly Color MutedText = Color.FromArgb(143, 166, 177);

	private readonly System.Windows.Forms.Timer animationTimer;
	private readonly Stopwatch animationClock = new();
	private readonly Stopwatch coldLaunchClock = new();
	private readonly Image markImage;
	private readonly bool reducedMotion;
	private readonly Form ownerForm;
	private readonly SplashAnimationSurface animationSurface;

	private Bitmap? backgroundCache;
	private Size backgroundCacheSize;
	private int backgroundCacheDpi;
	private Bitmap? surfaceBackgroundCache;
	private Rectangle surfaceBackgroundSourceBounds;
	private Bitmap? auraCache;
	private Bitmap? errorAuraCache;
	private Bitmap? presentationCache;
	private Size presentationCacheSize;
	private int presentationCacheDpi;
	private StartupSplashState presentationCacheState;
	private string presentationCacheMessage = string.Empty;

	private StartupSplashState state = StartupSplashState.Intro;
	private StartupSplashState exitSourceState = StartupSplashState.Intro;
	private string statusMessage = "Preparing Black Spirit Hub...";
	private bool applicationReady;
	private bool coldLaunchStarted;
	private bool coldLaunchCompleted;
	private bool nativeOpacitySupported = true;
	private bool highResolutionTimerActive;
	private long exitStartedMilliseconds;

	public StartupSplashWindow(Form owner, Icon fallbackIcon)
	{
		ArgumentNullException.ThrowIfNull(owner);
		ArgumentNullException.ThrowIfNull(fallbackIcon);
		ownerForm = owner;
		markImage = LoadMarkImage(fallbackIcon);
		reducedMotion = IsReducedMotionEnabled();
		animationTimer = new System.Windows.Forms.Timer { Interval = AnimationIntervalMilliseconds };
		animationTimer.Tick += OnAnimationTick;
		animationSurface = new SplashAnimationSurface(this)
		{
			TabStop = false,
			Cursor = Cursors.WaitCursor
		};

		FormBorderStyle = FormBorderStyle.None;
		StartPosition = FormStartPosition.Manual;
		ShowInTaskbar = false;
		ShowIcon = false;
		ControlBox = false;
		MinimizeBox = false;
		MaximizeBox = false;
		AutoScaleMode = AutoScaleMode.Dpi;
		BackColor = BackgroundFallback;
		Cursor = Cursors.WaitCursor;
		TabStop = false;
		AccessibleRole = AccessibleRole.Pane;
		AccessibleName = "Black Spirit Hub startup";
		AccessibleDescription = statusMessage;
		SetStyle(
			ControlStyles.UserPaint
			| ControlStyles.AllPaintingInWmPaint
			| ControlStyles.ResizeRedraw
			| ControlStyles.Opaque,
			true);
		Controls.Add(animationSurface);

		ownerForm.LocationChanged += OnOwnerBoundsChanged;
		ownerForm.SizeChanged += OnOwnerBoundsChanged;
		ownerForm.VisibleChanged += OnOwnerVisibleChanged;
	}

	internal StartupSplashState State => state;

	internal bool ReducedMotion => reducedMotion;

	internal static bool ShouldBeginColdExit(long elapsedMilliseconds, bool ready)
	{
		return ready && elapsedMilliseconds >= MinimumColdLaunchDurationMilliseconds;
	}

	internal static bool ShouldBeginRestoringExit(
		long coldLaunchElapsedMilliseconds,
		bool coldMinimumRequired,
		bool ready)
	{
		return ready
			&& (!coldMinimumRequired
				|| coldLaunchElapsedMilliseconds >= MinimumColdLaunchDurationMilliseconds);
	}

	protected override bool ShowWithoutActivation => true;

	protected override CreateParams CreateParams
	{
		get
		{
			CreateParams parameters = base.CreateParams;
			parameters.ExStyle |= WsExToolWindow | WsExNoActivate;
			return parameters;
		}
	}

	public void StartColdLaunch()
	{
		if (coldLaunchStarted || IsDisposed)
			return;

		coldLaunchStarted = true;
		coldLaunchCompleted = false;
		applicationReady = false;
		statusMessage = "Preparing Black Spirit Hub...";
		AccessibleDescription = statusMessage;
		state = StartupSplashState.Intro;
		Cursor = Cursors.WaitCursor;
		animationSurface.Cursor = Cursors.WaitCursor;
		InvalidatePresentationCache();
		SetOverlayOpacity(1d);
		EnsureShown();
		animationTimer.Interval = reducedMotion
			? HoldingPollIntervalMilliseconds
			: AnimationIntervalMilliseconds;
		coldLaunchClock.Restart();
		animationClock.Restart();
		BeginHighResolutionTimer();
		animationTimer.Start();
		animationSurface.Invalidate();
	}

	public void MarkApplicationReady()
	{
		if (IsDisposed || state is StartupSplashState.Error or StartupSplashState.Hidden)
			return;

		applicationReady = true;
		long elapsed = animationClock.ElapsedMilliseconds;
		if (((state is StartupSplashState.Intro or StartupSplashState.Holding)
				&& ShouldBeginColdExit(coldLaunchClock.ElapsedMilliseconds, applicationReady))
			|| (state == StartupSplashState.Restoring
				&& ShouldBeginRestoringExit(
					coldLaunchClock.ElapsedMilliseconds,
					ColdMinimumRequired,
					applicationReady)))
		{
			BeginExit(elapsed);
		}
	}

	public void ShowRestoring(string message)
	{
		if (IsDisposed)
			return;

		applicationReady = false;
		statusMessage = string.IsNullOrWhiteSpace(message)
			? "Restoring Black Spirit Hub..."
			: message.Trim();
		AccessibleDescription = statusMessage;
		state = StartupSplashState.Restoring;
		Cursor = Cursors.WaitCursor;
		animationSurface.Cursor = Cursors.WaitCursor;
		InvalidatePresentationCache();
		SetOverlayOpacity(1d);
		EnsureShown();
		animationTimer.Interval = reducedMotion
			? HoldingPollIntervalMilliseconds
			: AnimationIntervalMilliseconds;
		animationClock.Restart();
		BeginHighResolutionTimer();
		animationTimer.Start();
		animationSurface.Invalidate();
	}

	public void ShowError(string message)
	{
		if (IsDisposed)
			return;

		applicationReady = false;
		statusMessage = string.IsNullOrWhiteSpace(message)
			? "Black Spirit Hub could not start. Restart the app and try again."
			: message.Trim();
		AccessibleDescription = statusMessage;
		state = StartupSplashState.Error;
		Cursor = Cursors.Default;
		animationSurface.Cursor = Cursors.Default;
		animationTimer.Stop();
		EndHighResolutionTimer();
		animationClock.Stop();
		InvalidatePresentationCache();
		LayoutAnimationSurface();
		SetOverlayOpacity(1d);
		EnsureShown();
		animationSurface.Invalidate();
		if (IsHandleCreated)
		{
			try { AccessibilityNotifyClients(AccessibleEvents.SystemAlert, -1); } catch { }
		}
	}

	public void Stop()
	{
		if (IsDisposed)
			return;

		animationTimer.Stop();
		EndHighResolutionTimer();
		animationClock.Reset();
		coldLaunchClock.Stop();
		state = StartupSplashState.Hidden;
		Hide();
		SetOverlayOpacity(1d);
	}

	protected override void OnHandleCreated(EventArgs e)
	{
		base.OnHandleCreated(e);
		// WinForms finalizes per-monitor DPI when the native handle is created.
		// Re-anchor the small surface after that transition without rebuilding the
		// already cached full-window background unless the owner DPI changed.
		LayoutAnimationSurface();
		InvalidateSurfaceBackgroundCache();
		InvalidatePresentationCache();
		SetOverlayOpacity(1d);
	}

	protected override void OnPaintBackground(PaintEventArgs pevent)
	{
		// The complete opaque frame is painted in OnPaint to avoid an erase flash.
	}

	protected override void OnPaint(PaintEventArgs e)
	{
		EnsureBackgroundCache();
		DrawBackgroundSlice(e.Graphics, e.ClipRectangle);
	}

	protected override void OnResize(EventArgs e)
	{
		base.OnResize(e);
		InvalidateBackgroundCache();
		LayoutAnimationSurface();
		Invalidate();
	}

	protected override void OnDpiChanged(DpiChangedEventArgs e)
	{
		base.OnDpiChanged(e);
		InvalidateBackgroundCache();
		InvalidateVisualCaches();
		LayoutAnimationSurface();
		Invalidate();
	}

	protected override void Dispose(bool disposing)
	{
		if (disposing)
		{
			ownerForm.LocationChanged -= OnOwnerBoundsChanged;
			ownerForm.SizeChanged -= OnOwnerBoundsChanged;
			ownerForm.VisibleChanged -= OnOwnerVisibleChanged;
			animationTimer.Stop();
			EndHighResolutionTimer();
			animationTimer.Tick -= OnAnimationTick;
			animationTimer.Dispose();
			animationClock.Stop();
			coldLaunchClock.Stop();
			InvalidateBackgroundCache();
			InvalidateVisualCaches();
			markImage.Dispose();
		}
		base.Dispose(disposing);
	}

	private void OnAnimationTick(object? sender, EventArgs e)
	{
		if (IsDisposed)
			return;

		long elapsed = animationClock.ElapsedMilliseconds;
		switch (state)
		{
			case StartupSplashState.Intro when coldLaunchClock.ElapsedMilliseconds >= MinimumColdLaunchDurationMilliseconds:
				if (ShouldBeginColdExit(coldLaunchClock.ElapsedMilliseconds, applicationReady))
					BeginExit(elapsed);
				else
					state = StartupSplashState.Holding;
				break;
			case StartupSplashState.Holding when ShouldBeginColdExit(coldLaunchClock.ElapsedMilliseconds, applicationReady):
				BeginExit(elapsed);
				break;
			case StartupSplashState.Restoring when ShouldBeginRestoringExit(
				coldLaunchClock.ElapsedMilliseconds,
				ColdMinimumRequired,
				applicationReady):
				BeginExit(elapsed);
				break;
			case StartupSplashState.Exiting:
				double progress = Math.Clamp(
					(elapsed - exitStartedMilliseconds) / (double)ExitFadeDurationMilliseconds,
					0d,
					1d);
				double eased = CubicBezier(progress, 0.25d, 0.1d, 0.25d, 1d);
				SetOverlayOpacity(1d - eased);
				if (progress >= 1d)
				{
					CompleteExit();
					return;
				}
				break;
		}

		// Exit frames are frozen and handed to the desktop compositor; only the
		// small center surface repaints during active pulse/breathing states.
		if (state != StartupSplashState.Exiting && !reducedMotion)
			animationSurface.Invalidate();
	}

	private void BeginExit(long elapsedMilliseconds)
	{
		if (state == StartupSplashState.Exiting)
			return;

		exitSourceState = state;
		state = StartupSplashState.Exiting;
		exitStartedMilliseconds = elapsedMilliseconds;
		Cursor = Cursors.Default;
		animationSurface.Cursor = Cursors.Default;
		animationTimer.Interval = AnimationIntervalMilliseconds;
		BeginHighResolutionTimer();
		animationTimer.Start();
	}

	private void CompleteExit()
	{
		animationTimer.Stop();
		EndHighResolutionTimer();
		if (coldLaunchStarted && !coldLaunchCompleted)
		{
			coldLaunchCompleted = true;
			coldLaunchClock.Stop();
		}
		state = StartupSplashState.Hidden;
		Hide();
		SetOverlayOpacity(1d);
	}

	private void SetOverlayOpacity(double opacity)
	{
		if (!nativeOpacitySupported || IsDisposed)
			return;

		try
		{
			Opacity = Math.Clamp(opacity, 0d, 1d);
		}
		catch (Exception exception) when (exception is ArgumentException or InvalidOperationException)
		{
			// The owned splash remains fully opaque and hides after the same handoff
			// if desktop composition cannot animate the native window opacity.
			nativeOpacitySupported = false;
			try { Opacity = 1d; } catch { }
		}
	}

	private void EnsureShown()
	{
		if (IsDisposed || ownerForm.IsDisposed || state == StartupSplashState.Hidden)
			return;

		if (!ownerForm.Visible || ownerForm.WindowState == FormWindowState.Minimized)
		{
			if (Visible)
				Hide();
			return;
		}

		SyncToOwner();
		EnsureBackgroundCache();
		LayoutAnimationSurface();
		EnsureSurfaceBackgroundCache();
		StartupSplashState visualState = state == StartupSplashState.Exiting ? exitSourceState : state;
		EnsureAuraCaches();
		EnsurePresentationCache(visualState);
		if (!Visible)
			Show(ownerForm);
		else
			BringToFront();
	}

	private void SyncToOwner()
	{
		if (!ownerForm.IsDisposed && ownerForm.WindowState != FormWindowState.Minimized)
			Bounds = ownerForm.Bounds;
	}

	private void OnOwnerBoundsChanged(object? sender, EventArgs e)
	{
		if (Visible)
			SyncToOwner();
	}

	private void OnOwnerVisibleChanged(object? sender, EventArgs e)
	{
		if (!ownerForm.Visible || ownerForm.WindowState == FormWindowState.Minimized)
		{
			if (Visible)
				Hide();
			return;
		}

		if (state != StartupSplashState.Hidden)
			EnsureShown();
	}

	private void LayoutAnimationSurface()
	{
		if (animationSurface.IsDisposed || ClientSize.Width <= 0 || ClientSize.Height <= 0)
			return;

		float scale = DpiScale;
		bool error = state == StartupSplashState.Error
			|| (state == StartupSplashState.Exiting && exitSourceState == StartupSplashState.Error);
		int desiredWidth = (int)Math.Round((error ? 760f : 480f) * scale);
		int desiredHeight = (int)Math.Round((error ? 500f : 360f) * scale);
		int width = Math.Max(1, Math.Min(ClientSize.Width, desiredWidth));
		int height = Math.Max(1, Math.Min(ClientSize.Height, desiredHeight));
		Rectangle bounds = new(
			(ClientSize.Width - width) / 2,
			(ClientSize.Height - height) / 2,
			width,
			height);
		if (animationSurface.Bounds == bounds)
			return;

		animationSurface.Bounds = bounds;
		InvalidateSurfaceBackgroundCache();
		InvalidatePresentationCache();
	}

	private void PaintAnimationSurface(Graphics graphics, Rectangle clipRectangle)
	{
		EnsureSurfaceBackgroundCache();
		if (surfaceBackgroundCache is not null)
		{
			Rectangle clip = Rectangle.Intersect(clipRectangle, new Rectangle(Point.Empty, surfaceBackgroundCache.Size));
			if (!clip.IsEmpty)
			{
				graphics.DrawImage(
					surfaceBackgroundCache,
					clip,
					clip.X,
					clip.Y,
					clip.Width,
					clip.Height,
					GraphicsUnit.Pixel);
			}
		}
		else
		{
			graphics.Clear(BackgroundFallback);
		}

		if (animationSurface.ClientSize.Width <= 0 || animationSurface.ClientSize.Height <= 0)
			return;

		long elapsed = animationClock.ElapsedMilliseconds;
		StartupSplashState visualState = state == StartupSplashState.Exiting ? exitSourceState : state;
		float scale = DpiScale;
		float centerY = animationSurface.ClientSize.Height / 2f
			- (visualState == StartupSplashState.Error ? 82f : 32f) * scale;
		PointF center = new(animationSurface.ClientSize.Width / 2f, centerY);

		graphics.SmoothingMode = SmoothingMode.AntiAlias;
		graphics.CompositingQuality = CompositingQuality.HighSpeed;
		graphics.InterpolationMode = InterpolationMode.HighQualityBilinear;
		DrawAura(graphics, center, visualState, elapsed);
		DrawPulseRing(graphics, center, visualState, elapsed);
		EnsurePresentationCache(visualState);
		if (presentationCache is not null)
			graphics.DrawImageUnscaled(presentationCache, 0, 0);
		DrawLoadingDots(graphics, center, visualState, elapsed);
	}

	private void DrawAura(
		Graphics graphics,
		PointF center,
		StartupSplashState visualState,
		long elapsedMilliseconds)
	{
		EnsureAuraCaches();
		Bitmap? aura = visualState == StartupSplashState.Error ? errorAuraCache : auraCache;
		if (aura is null)
			return;

		double opacity;
		if (reducedMotion || visualState == StartupSplashState.Error)
		{
			opacity = 0.78d;
		}
		else if (visualState == StartupSplashState.Intro
			&& elapsedMilliseconds < MinimumColdLaunchDurationMilliseconds)
		{
			opacity = 0.58d + 0.42d * GetPulseEnvelope(elapsedMilliseconds);
		}
		else
		{
			double period = visualState == StartupSplashState.Restoring ? 1_600d : 2_400d;
			double breath = 0.5d + 0.5d * Math.Sin(elapsedMilliseconds / period * Math.PI * 2d);
			opacity = 0.64d + 0.18d * breath;
		}

		Rectangle destination = new(
			(int)Math.Round(center.X - aura.Width / 2f),
			(int)Math.Round(center.Y - aura.Height / 2f),
			aura.Width,
			aura.Height);
		DrawImageWithAlpha(graphics, aura, destination, (float)opacity);
	}

	private void DrawPulseRing(
		Graphics graphics,
		PointF center,
		StartupSplashState visualState,
		long elapsedMilliseconds)
	{
		float scale = DpiScale;
		Color ringColor = visualState == StartupSplashState.Error ? Color.IndianRed : Cyan;
		using (Pen restingRing = new(Color.FromArgb(34, ringColor), Math.Max(1f, scale)))
		{
			graphics.DrawEllipse(restingRing, CenteredRectangle(center, 166f * scale, 166f * scale));
		}

		if (reducedMotion || visualState != StartupSplashState.Intro
			|| elapsedMilliseconds >= MinimumColdLaunchDurationMilliseconds)
			return;

		double phase = (elapsedMilliseconds % PulseCycleDurationMilliseconds)
			/ (double)PulseCycleDurationMilliseconds;
		double eased = CubicBezier(phase, 0.2d, 0.75d, 0.22d, 1d);
		float diameter = (float)Lerp(166d, 226d, eased) * scale;
		double attack = SmoothStep(0d, 0.14d, phase);
		double release = 1d - SmoothStep(0.14d, 1d, phase);
		int alpha = Math.Clamp((int)Math.Round(78d * attack * release), 0, byte.MaxValue);
		using Pen echo = new(Color.FromArgb(alpha, Cyan), Math.Max(1f, 1.15f * scale));
		graphics.DrawEllipse(echo, CenteredRectangle(center, diameter, diameter));
	}

	private void DrawLoadingDots(
		Graphics graphics,
		PointF center,
		StartupSplashState visualState,
		long elapsedMilliseconds)
	{
		if (visualState == StartupSplashState.Error)
			return;

		float scale = DpiScale;
		float diameter = Math.Max(2f, 3f * scale);
		float spacing = 11f * scale;
		float y = center.Y + 166f * scale;
		for (int index = 0; index < 3; index++)
		{
			double intensity = reducedMotion
				? 0.55d
				: 0.5d + 0.5d * Math.Sin(elapsedMilliseconds / 620d * Math.PI * 2d - index * 1.15d);
			int alpha = Math.Clamp((int)Math.Round(58d + 152d * intensity), 0, byte.MaxValue);
			using SolidBrush dot = new(Color.FromArgb(alpha, PaleCyan));
			graphics.FillEllipse(
				dot,
				center.X + (index - 1) * spacing - diameter / 2f,
				y - diameter / 2f,
				diameter,
				diameter);
		}
	}

	private void EnsureBackgroundCache()
	{
		Size requiredSize = ClientSize;
		if (requiredSize.Width <= 0 || requiredSize.Height <= 0)
			return;

		if (backgroundCache is not null
			&& backgroundCacheSize == requiredSize
			&& backgroundCacheDpi == ownerForm.DeviceDpi)
			return;

		InvalidateBackgroundCache();
		try
		{
			backgroundCache = CreateDitheredBackground(requiredSize.Width, requiredSize.Height);
			backgroundCacheSize = requiredSize;
			backgroundCacheDpi = ownerForm.DeviceDpi;
		}
		catch
		{
			InvalidateBackgroundCache();
		}
	}

	private static Bitmap CreateDitheredBackground(int width, int height)
	{
		Bitmap bitmap = new(width, height, PixelFormat.Format32bppPArgb);
		Rectangle bounds = new(0, 0, width, height);
		BitmapData data = bitmap.LockBits(bounds, ImageLockMode.WriteOnly, PixelFormat.Format32bppPArgb);
		try
		{
			int rowBytes = width * 4;
			byte[] pixels = new byte[rowBytes * height];
			double widthDivisor = Math.Max(1, width - 1);
			double heightDivisor = Math.Max(1, height - 1);
			double[] centerXFactors = new double[width];
			double[] upperXFactors = new double[width];
			double[] vignetteXTerms = new double[width];
			for (int x = 0; x < width; x++)
			{
				double fx = x / widthDivisor;
				double centerX = (fx - 0.5d) / 0.34d;
				double upperX = (fx - 0.18d) / 0.58d;
				double vignetteX = (fx - 0.5d) / 0.72d;
				centerXFactors[x] = Math.Exp(-(centerX * centerX) * 1.7d);
				upperXFactors[x] = Math.Exp(-(upperX * upperX) * 2.2d);
				vignetteXTerms[x] = vignetteX * vignetteX;
			}
			double[] centerYFactors = new double[height];
			double[] upperYFactors = new double[height];
			double[] vignetteYTerms = new double[height];
			for (int y = 0; y < height; y++)
			{
				double fy = y / heightDivisor;
				double centerY = (fy - 0.45d) / 0.52d;
				double upperY = (fy - 0.08d) / 0.46d;
				double vignetteY = (fy - 0.5d) / 0.82d;
				centerYFactors[y] = Math.Exp(-(centerY * centerY) * 1.7d);
				upperYFactors[y] = Math.Exp(-(upperY * upperY) * 2.2d);
				vignetteYTerms[y] = vignetteY * vignetteY;
			}
			for (int y = 0; y < height; y++)
			{
				double fy = y / heightDivisor;
				for (int x = 0; x < width; x++)
				{
					double centerLift = centerXFactors[x] * centerYFactors[y];
					double upperLift = upperXFactors[x] * upperYFactors[y];
					double vignette = SmoothStep(
					0.24d,
					1.12d,
					vignetteXTerms[x] + vignetteYTerms[y]);

					uint hash = unchecked((uint)x * 374_761_393u + (uint)y * 668_265_263u);
					hash = unchecked((hash ^ (hash >> 13)) * 1_274_126_177u);
					double dither = ((hash & 1023u) / 1023d - 0.5d) * 1.4d;

					double red = Lerp(5d, 3d, fy) + centerLift * 1.5d + upperLift * 0.25d - vignette * 2.1d + dither;
					double green = Lerp(9d, 5d, fy) + centerLift * 7.2d + upperLift * 2.2d - vignette * 2.6d + dither;
					double blue = Lerp(17d, 11d, fy) + centerLift * 10.8d + upperLift * 4.4d - vignette * 3.2d + dither;

					int offset = y * rowBytes + x * 4;
					pixels[offset] = ToByte(blue);
					pixels[offset + 1] = ToByte(green);
					pixels[offset + 2] = ToByte(red);
					pixels[offset + 3] = byte.MaxValue;
				}
			}

			for (int y = 0; y < height; y++)
			{
				Marshal.Copy(
					pixels,
					y * rowBytes,
					IntPtr.Add(data.Scan0, y * data.Stride),
					rowBytes);
			}
		}
		finally
		{
			bitmap.UnlockBits(data);
		}
		return bitmap;
	}

	private void DrawBackgroundSlice(Graphics graphics, Rectangle requestedClip)
	{
		Rectangle client = new(Point.Empty, ClientSize);
		Rectangle clip = Rectangle.Intersect(requestedClip, client);
		if (clip.IsEmpty)
			return;

		if (backgroundCache is null)
		{
			using SolidBrush fallback = new(BackgroundFallback);
			graphics.FillRectangle(fallback, clip);
			return;
		}

		graphics.CompositingMode = CompositingMode.SourceCopy;
		graphics.DrawImage(
			backgroundCache,
			clip,
			clip.X,
			clip.Y,
			clip.Width,
			clip.Height,
			GraphicsUnit.Pixel);
		graphics.CompositingMode = CompositingMode.SourceOver;
	}

	private void EnsureSurfaceBackgroundCache()
	{
		EnsureBackgroundCache();
		Rectangle source = animationSurface.Bounds;
		if (source.Width <= 0 || source.Height <= 0)
			return;

		if (surfaceBackgroundCache is not null
			&& surfaceBackgroundSourceBounds == source
			&& surfaceBackgroundCache.Size == source.Size)
			return;

		InvalidateSurfaceBackgroundCache();
		if (backgroundCache is null)
			return;

		try
		{
			surfaceBackgroundCache = new Bitmap(source.Width, source.Height, PixelFormat.Format32bppPArgb);
			using Graphics graphics = Graphics.FromImage(surfaceBackgroundCache);
			graphics.CompositingMode = CompositingMode.SourceCopy;
			graphics.DrawImage(
				backgroundCache,
				new Rectangle(0, 0, source.Width, source.Height),
				source,
				GraphicsUnit.Pixel);
			surfaceBackgroundSourceBounds = source;
		}
		catch
		{
			InvalidateSurfaceBackgroundCache();
		}
	}

	private void EnsureAuraCaches()
	{
		int diameter = Math.Max(1, (int)Math.Round(244f * DpiScale));
		if (auraCache is not null && auraCache.Width == diameter && errorAuraCache is not null)
			return;

		auraCache?.Dispose();
		errorAuraCache?.Dispose();
		auraCache = null;
		errorAuraCache = null;
		try
		{
			auraCache = CreateAuraBitmap(diameter, Cyan, 32);
			errorAuraCache = CreateAuraBitmap(diameter, Color.FromArgb(248, 113, 113), 26);
		}
		catch
		{
			auraCache?.Dispose();
			errorAuraCache?.Dispose();
			auraCache = null;
			errorAuraCache = null;
		}
	}

	private static Bitmap CreateAuraBitmap(int diameter, Color color, int peakAlpha)
	{
		Bitmap bitmap = new(diameter, diameter, PixelFormat.Format32bppPArgb);
		Rectangle bounds = new(0, 0, diameter, diameter);
		BitmapData data = bitmap.LockBits(bounds, ImageLockMode.WriteOnly, PixelFormat.Format32bppPArgb);
		try
		{
			int rowBytes = diameter * 4;
			byte[] pixels = new byte[rowBytes * diameter];
			double center = (diameter - 1) / 2d;
			double radius = Math.Max(1d, diameter / 2d);
			for (int y = 0; y < diameter; y++)
			{
				for (int x = 0; x < diameter; x++)
				{
					double dx = (x - center) / radius;
					double dy = (y - center) / radius;
					double distanceSquared = dx * dx + dy * dy;
					double falloff = Math.Exp(-distanceSquared * 3.35d)
						* Math.Pow(Math.Clamp(1d - distanceSquared, 0d, 1d), 0.65d);
					uint hash = unchecked((uint)x * 2_654_435_761u + (uint)y * 2_246_822_519u);
					hash ^= hash >> 15;
					double dither = ((hash & 255u) / 255d - 0.5d) * 1.1d;
					int alpha = Math.Clamp((int)Math.Round(peakAlpha * falloff + dither), 0, byte.MaxValue);
					int offset = y * rowBytes + x * 4;
					pixels[offset] = (byte)(color.B * alpha / byte.MaxValue);
					pixels[offset + 1] = (byte)(color.G * alpha / byte.MaxValue);
					pixels[offset + 2] = (byte)(color.R * alpha / byte.MaxValue);
					pixels[offset + 3] = (byte)alpha;
				}
			}

			for (int y = 0; y < diameter; y++)
			{
				Marshal.Copy(
					pixels,
					y * rowBytes,
					IntPtr.Add(data.Scan0, y * data.Stride),
					rowBytes);
			}
		}
		finally
		{
			bitmap.UnlockBits(data);
		}
		return bitmap;
	}

	private void EnsurePresentationCache(StartupSplashState visualState)
	{
		Size requiredSize = animationSurface.ClientSize;
		if (requiredSize.Width <= 0 || requiredSize.Height <= 0)
			return;
		if (presentationCache is not null
			&& presentationCacheSize == requiredSize
			&& presentationCacheDpi == ownerForm.DeviceDpi
			&& presentationCacheState == visualState
			&& string.Equals(presentationCacheMessage, statusMessage, StringComparison.Ordinal))
			return;

		InvalidatePresentationCache();
		try
		{
			presentationCache = new Bitmap(requiredSize.Width, requiredSize.Height, PixelFormat.Format32bppPArgb);
			presentationCacheSize = requiredSize;
			presentationCacheDpi = ownerForm.DeviceDpi;
			presentationCacheState = visualState;
			presentationCacheMessage = statusMessage;
			using Graphics graphics = Graphics.FromImage(presentationCache);
			graphics.SmoothingMode = SmoothingMode.AntiAlias;
			graphics.CompositingQuality = CompositingQuality.HighQuality;
			graphics.InterpolationMode = InterpolationMode.HighQualityBicubic;
			graphics.PixelOffsetMode = PixelOffsetMode.HighQuality;

			float scale = DpiScale;
			float centerY = requiredSize.Height / 2f
				- (visualState == StartupSplashState.Error ? 82f : 32f) * scale;
			PointF center = new(requiredSize.Width / 2f, centerY);
			float wellDiameter = 156f * scale;
			RectangleF wellBounds = CenteredRectangle(center, wellDiameter, wellDiameter);
			using (SolidBrush shadow = new(Color.FromArgb(42, 0, 0, 0)))
			{
				graphics.FillEllipse(shadow, CenteredRectangle(center, wellDiameter + 10f * scale, wellDiameter + 10f * scale));
			}
			using (LinearGradientBrush well = new(wellBounds, SpiritWellTop, SpiritWellBottom, 90f))
			{
				graphics.FillEllipse(well, wellBounds);
			}
			Color accent = visualState == StartupSplashState.Error ? Color.FromArgb(248, 113, 113) : Cyan;
			using (Pen outline = new(Color.FromArgb(58, accent), Math.Max(1f, 1.05f * scale)))
			{
				graphics.DrawEllipse(outline, wellBounds);
			}
			using (Pen highlight = new(Color.FromArgb(72, accent), Math.Max(1f, 1.15f * scale)))
			{
				graphics.DrawArc(highlight, RectangleF.Inflate(wellBounds, -4f * scale, -4f * scale), 205f, 130f);
			}

			float markSize = 98f * scale;
			RectangleF markBounds = CenteredRectangle(center, markSize, markSize);
			graphics.DrawImage(markImage, markBounds);

			float titleY = center.Y + 101f * scale;
			using Font titleFont = new("Segoe UI Semibold", 16f * scale, FontStyle.Bold, GraphicsUnit.Pixel);
			using Font statusFont = new(
				"Segoe UI",
				(visualState == StartupSplashState.Error ? 13f : 12f) * scale,
				FontStyle.Regular,
				GraphicsUnit.Pixel);
			using StringFormat centered = new()
			{
				Alignment = StringAlignment.Center,
				LineAlignment = StringAlignment.Near,
				Trimming = StringTrimming.EllipsisWord
			};

			string title = visualState == StartupSplashState.Error
				? "STARTUP NEEDS ATTENTION"
				: "BLACK SPIRIT HUB";
			using SolidBrush titleBrush = new(
				visualState == StartupSplashState.Error
					? Color.FromArgb(255, 253, 186, 116)
					: PrimaryText);
			graphics.DrawString(
				title,
				titleFont,
				titleBrush,
				new RectangleF(20f * scale, titleY, requiredSize.Width - 40f * scale, 30f * scale),
				centered);

			float messageWidth = Math.Min(
				requiredSize.Width - 48f * scale,
				visualState == StartupSplashState.Error ? 700f * scale : 460f * scale);
			float messageHeight = visualState == StartupSplashState.Error
				? Math.Max(110f * scale, requiredSize.Height - titleY - 42f * scale)
				: 42f * scale;
			RectangleF messageBounds = new(
				center.X - messageWidth / 2f,
				titleY + 34f * scale,
				messageWidth,
				messageHeight);
			using SolidBrush messageBrush = new(
				visualState == StartupSplashState.Error
					? Color.FromArgb(235, 231, 238, 250)
					: MutedText);
			graphics.DrawString(statusMessage, statusFont, messageBrush, messageBounds, centered);
		}
		catch
		{
			InvalidatePresentationCache();
		}
	}

	private void InvalidateBackgroundCache()
	{
		backgroundCache?.Dispose();
		backgroundCache = null;
		backgroundCacheSize = Size.Empty;
		backgroundCacheDpi = 0;
		InvalidateSurfaceBackgroundCache();
	}

	private void InvalidateSurfaceBackgroundCache()
	{
		surfaceBackgroundCache?.Dispose();
		surfaceBackgroundCache = null;
		surfaceBackgroundSourceBounds = Rectangle.Empty;
	}

	private void InvalidateVisualCaches()
	{
		auraCache?.Dispose();
		auraCache = null;
		errorAuraCache?.Dispose();
		errorAuraCache = null;
		InvalidatePresentationCache();
	}

	private void InvalidatePresentationCache()
	{
		presentationCache?.Dispose();
		presentationCache = null;
		presentationCacheSize = Size.Empty;
		presentationCacheDpi = 0;
		presentationCacheMessage = string.Empty;
	}

	private void BeginHighResolutionTimer()
	{
		if (reducedMotion || highResolutionTimerActive)
			return;
		try
		{
			highResolutionTimerActive = timeBeginPeriod(TimerResolutionMilliseconds) == 0;
		}
		catch
		{
			highResolutionTimerActive = false;
		}
	}

	private void EndHighResolutionTimer()
	{
		if (!highResolutionTimerActive)
			return;
		try { timeEndPeriod(TimerResolutionMilliseconds); } catch { }
		highResolutionTimerActive = false;
	}

	private static double GetPulseEnvelope(long elapsedMilliseconds)
	{
		double phase = (elapsedMilliseconds % PulseCycleDurationMilliseconds)
			/ (double)PulseCycleDurationMilliseconds;
		return 0.5d - 0.5d * Math.Cos(phase * Math.PI * 2d);
	}

	private bool ColdMinimumRequired => coldLaunchStarted && !coldLaunchCompleted;

	private float DpiScale => Math.Max(1f, ownerForm.DeviceDpi / 96f);

	private static void DrawImageWithAlpha(Graphics graphics, Image image, Rectangle bounds, float alpha)
	{
		if (alpha >= 0.995f)
		{
			graphics.DrawImageUnscaled(image, bounds.Location);
			return;
		}

		ColorMatrix matrix = new() { Matrix33 = Math.Clamp(alpha, 0f, 1f) };
		using ImageAttributes attributes = new();
		attributes.SetColorMatrix(matrix, ColorMatrixFlag.Default, ColorAdjustType.Bitmap);
		graphics.DrawImage(
			image,
			bounds,
			0,
			0,
			image.Width,
			image.Height,
			GraphicsUnit.Pixel,
			attributes);
	}

	private static Image LoadMarkImage(Icon fallbackIcon)
	{
		string iconDirectory = Path.Combine(AppContext.BaseDirectory, "Assets", "AppIcon");
		string pngPath = Path.Combine(iconDirectory, "app-icon-ui.png");
		try
		{
			if (File.Exists(pngPath))
			{
				using FileStream stream = new(pngPath, FileMode.Open, FileAccess.Read, FileShare.Read);
				using Image source = Image.FromStream(stream);
				return new Bitmap(source);
			}
		}
		catch
		{
		}

		try
		{
			string icoPath = Path.Combine(iconDirectory, "app-icon.ico");
			if (File.Exists(icoPath))
			{
				using Icon packagedIcon = new(icoPath, new Size(256, 256));
				return packagedIcon.ToBitmap();
			}
		}
		catch
		{
		}

		return fallbackIcon.ToBitmap();
	}

	private static bool IsReducedMotionEnabled()
	{
		bool managedEffectsDisabled = !SystemInformation.UIEffectsEnabled || SystemInformation.HighContrast;
		try
		{
			bool animationsEnabled = true;
			if (SystemParametersInfo(SpiGetClientAreaAnimation, 0, ref animationsEnabled, 0))
				return managedEffectsDisabled || !animationsEnabled;
		}
		catch
		{
		}
		return managedEffectsDisabled;
	}

	private static RectangleF CenteredRectangle(PointF center, float width, float height)
	{
		return new RectangleF(center.X - width / 2f, center.Y - height / 2f, width, height);
	}

	private static double Lerp(double from, double to, double amount)
	{
		return from + (to - from) * amount;
	}

	private static byte ToByte(double value)
	{
		return (byte)Math.Clamp((int)Math.Round(value), 0, byte.MaxValue);
	}

	private static double SmoothStep(double edge0, double edge1, double value)
	{
		double amount = Math.Clamp((value - edge0) / (edge1 - edge0), 0d, 1d);
		return amount * amount * (3d - 2d * amount);
	}

	private static double CubicBezier(double progress, double x1, double y1, double x2, double y2)
	{
		progress = Math.Clamp(progress, 0d, 1d);
		double lower = 0d;
		double upper = 1d;
		double parameter = progress;
		for (int iteration = 0; iteration < 14; iteration++)
		{
			double x = BezierCoordinate(parameter, x1, x2);
			if (Math.Abs(x - progress) < 0.0001d)
				break;
			if (x < progress)
				lower = parameter;
			else
				upper = parameter;
			parameter = (lower + upper) / 2d;
		}
		return BezierCoordinate(parameter, y1, y2);
	}

	private static double BezierCoordinate(double parameter, double firstControl, double secondControl)
	{
		double inverse = 1d - parameter;
		return 3d * inverse * inverse * parameter * firstControl
			+ 3d * inverse * parameter * parameter * secondControl
			+ parameter * parameter * parameter;
	}

	[DllImport("user32.dll", SetLastError = true)]
	[return: MarshalAs(UnmanagedType.Bool)]
	private static extern bool SystemParametersInfo(
		uint action,
		uint parameter,
		[MarshalAs(UnmanagedType.Bool)] ref bool value,
		uint updateFlags);

	[DllImport("winmm.dll", ExactSpelling = true)]
	private static extern uint timeBeginPeriod(uint periodMilliseconds);

	[DllImport("winmm.dll", ExactSpelling = true)]
	private static extern uint timeEndPeriod(uint periodMilliseconds);

	private sealed class SplashAnimationSurface : Control
	{
		private readonly StartupSplashWindow parent;

		public SplashAnimationSurface(StartupSplashWindow parentWindow)
		{
			parent = parentWindow;
			SetStyle(
				ControlStyles.UserPaint
				| ControlStyles.AllPaintingInWmPaint
				| ControlStyles.OptimizedDoubleBuffer
				| ControlStyles.Opaque,
				true);
		}

		protected override void OnPaintBackground(PaintEventArgs pevent)
		{
			// The cached crop is painted with the animation in a single buffer.
		}

		protected override void OnPaint(PaintEventArgs e)
		{
			parent.PaintAnimationSurface(e.Graphics, e.ClipRectangle);
		}
	}
}
