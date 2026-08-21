using System;
using System.Collections.Generic;
using System.Collections.Concurrent;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;
using System.Diagnostics;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace BlackSpiritHub;

internal sealed class CalculatorForm : Form
{
	private const string LocalAppHost = "app.bdo.local";
	private const string UiRevision = "coupon-boss-alerts-20260821";
	private const string RecipeBookHost = "recipebook.bdo.local";
	[ComImport]
	[Guid("56FDF344-FD6D-11d0-958A-006097C9A090")]
	private sealed class CTaskbarList
	{
	}

	[ComImport]
	[Guid("EA1AFB91-9E28-4B86-90E9-9E9F8A5EEFAF")]
	[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
	private interface ITaskbarList3
	{
		void HrInit();
		void AddTab(IntPtr hwnd);
		void DeleteTab(IntPtr hwnd);
		void ActivateTab(IntPtr hwnd);
		void SetActiveAlt(IntPtr hwnd);
		void MarkFullscreenWindow(IntPtr hwnd, [MarshalAs(UnmanagedType.Bool)] bool fFullscreen);
		void SetProgressValue(IntPtr hwnd, ulong ullCompleted, ulong ullTotal);
		void SetProgressState(IntPtr hwnd, int tbpFlags);
		void RegisterTab(IntPtr hwndTab, IntPtr hwndMDI);
		void UnregisterTab(IntPtr hwndTab);
		void SetTabOrder(IntPtr hwndTab, IntPtr hwndInsertBefore);
		void SetTabActive(IntPtr hwndTab, IntPtr hwndMDI, uint dwReserved);
		void ThumbBarAddButtons(IntPtr hwnd, uint cButtons, IntPtr pButton);
		void ThumbBarUpdateButtons(IntPtr hwnd, uint cButtons, IntPtr pButton);
		void ThumbBarSetImageList(IntPtr hwnd, IntPtr himl);
		void SetOverlayIcon(IntPtr hwnd, IntPtr hIcon, [MarshalAs(UnmanagedType.LPWStr)] string pszDescription);
		void SetThumbnailTooltip(IntPtr hwnd, [MarshalAs(UnmanagedType.LPWStr)] string pszTip);
		void SetThumbnailClip(IntPtr hwnd, IntPtr prcClip);
	}

	[DllImport("winmm.dll", CharSet = CharSet.Unicode)]
	private static extern int mciSendString(string command, StringBuilder? returnValue, int returnLength, IntPtr callback);

	[DllImport("winmm.dll", CharSet = CharSet.Unicode)]
	[return: MarshalAs(UnmanagedType.Bool)]
	private static extern bool mciGetErrorString(int errorCode, StringBuilder errorText, int errorTextLength);

	[DllImport("user32.dll", SetLastError = true)]
	[return: MarshalAs(UnmanagedType.Bool)]
	private static extern bool DestroyIcon(IntPtr hIcon);

	private const int WmNcHitTest = 132;

	internal const int DefaultAlertVolumePercent = 50;

	private const int MciMaximumVolume = 1000;

	internal static int DefaultAlarmMciVolume => MciMaximumVolume * DefaultAlertVolumePercent / 100;

	private const int WmNcLButtonDown = 161;

	private const int HtCaption = 2;

	private const int HtLeft = 10;
	private const int HtRight = 11;
	private const int HtTop = 12;
	private const int HtTopLeft = 13;
	private const int HtTopRight = 14;
	private const int HtBottom = 15;
	private const int HtBottomLeft = 16;
	private const int HtBottomRight = 17;
	private const int WsThickFrame = 0x00040000;
	private const int WsMaximizeBox = 0x00010000;
	private const int ResizeBorder = 9;
	private const int ResizeCorner = 18;
	private const long MaxInstallerBytes = 250L * 1024 * 1024;

	private readonly AppPaths paths;

	private readonly AppLogger logger;

	private WebView2 webView;

	private WebView2? eventsBrowserView;

	private readonly StartupSplashWindow startupSplash;

	private readonly Queue<DateTime> webViewRecoveryHistory = new();

	private bool webViewRecoveryActive;

	private bool webViewHealthCheckActive;

	private bool webViewClosing;

	private int webViewGeneration = 1;

	private int recentUnresponsiveFailures;

	private DateTime lastUnresponsiveFailureUtc = DateTime.MinValue;

	private readonly PortraitReplacerService portraitReplacerService;

	private readonly FontChangerService fontChangerService;

	private readonly CouponService couponService;

	private readonly EventService eventService;

	private readonly BossScheduleService bossScheduleService;

	private readonly BdoPlayerGuildService playerGuildService;

	private readonly DehkiaFuelService dehkiaFuelService;
	private readonly RecipeBookScreenshotService recipeBookScreenshotService;

	private readonly UpdateCheckerService updateCheckerService;
	private readonly MarketDatabase marketDatabase;
	private readonly AppHealthService appHealthService;

	private MarketAnalyticsService? marketService;

	private Task? marketInitializationTask;

	private readonly GrindMarketPriceProvider grindMarketPriceProvider;

	private readonly NotifyIcon trayIcon;

	private readonly Icon appIcon;

	private readonly Icon trayAppIcon;

	private readonly CancellationTokenSource lifetimeCancellation = new();

	private readonly ConcurrentDictionary<string, CancellationTokenSource> activeBridgeRequests = new(StringComparer.Ordinal);

	private bool minimizeToTray = AppBehaviorSettings.Default.MinimizeToTray;

	private bool forceCloseFromTray;

	private int alarmPlayId;

	private string? activeAlarmAlias;

	private System.Windows.Forms.Timer? alarmCleanupTimer;

	private readonly SemaphoreSlim speechGate = new(1, 1);

	private ITaskbarList3? taskbarList;

	private Icon? taskbarBadgeIcon;

	private Icon? trayBadgeIcon;

	private int couponBadgeCount;

	private System.Windows.Forms.Timer? backgroundNotificationTimer;

	private int backgroundNotificationTickActive;

	private static readonly JsonSerializerOptions JsonOptions = new JsonSerializerOptions
	{
		PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
		PropertyNameCaseInsensitive = true
	};

	public CalculatorForm(AppPaths paths, AppLogger logger)
	{
		this.paths = paths;
		this.logger = logger;
		portraitReplacerService = new PortraitReplacerService(paths);
		fontChangerService = new FontChangerService(paths);
		couponService = new CouponService(paths, logger);
		eventService = new EventService(paths, logger);
		bossScheduleService = new BossScheduleService(paths, logger);
		playerGuildService = new BdoPlayerGuildService(paths, logger);
		dehkiaFuelService = new DehkiaFuelService(paths, logger);
		recipeBookScreenshotService = new RecipeBookScreenshotService(AppContext.BaseDirectory);
		updateCheckerService = new UpdateCheckerService(logger);
		marketDatabase = new MarketDatabase(paths.DatabasePath);
		appHealthService = new AppHealthService(marketDatabase, AppContext.BaseDirectory, logger);
		grindMarketPriceProvider = new GrindMarketPriceProvider(logger);
		Text = "Black Spirit Hub";
		appIcon = LoadPackagedIcon("app-icon.ico", SystemInformation.IconSize)
			?? (Icon?)System.Drawing.Icon.ExtractAssociatedIcon(Environment.ProcessPath)?.Clone()
			?? (Icon)SystemIcons.Application.Clone();
		trayAppIcon = LoadPackagedIcon("tray-icon.ico", SystemInformation.SmallIconSize) ?? (Icon)appIcon.Clone();
		base.Icon = appIcon;
		trayIcon = CreateTrayIcon();
		base.StartPosition = FormStartPosition.CenterScreen;
		MinimumSize = new Size(980, 680);
		base.Size = new Size(1400, 900);
		BackColor = Color.FromArgb(7, 17, 31);
		base.FormBorderStyle = FormBorderStyle.None;
		base.Padding = Padding.Empty;
		SetStyle(ControlStyles.ResizeRedraw, true);
		startupSplash = new StartupSplashWindow(this, appIcon);
		webView = CreateMainWebViewControl();
		base.Controls.Add(webView);
	}

	private static WebView2 CreateMainWebViewControl()
	{
		return new WebView2
		{
			Dock = DockStyle.Fill,
			DefaultBackgroundColor = Color.FromArgb(7, 17, 31),
			Visible = false
		};
	}

	private static Icon? LoadPackagedIcon(string fileName, Size requestedSize)
	{
		try
		{
			string iconPath = Path.Combine(AppContext.BaseDirectory, "Assets", "AppIcon", fileName);
			if (!File.Exists(iconPath))
			{
				return null;
			}

			int width = Math.Max(16, requestedSize.Width);
			int height = Math.Max(16, requestedSize.Height);
			return new Icon(iconPath, width, height);
		}
		catch
		{
			return null;
		}
	}

	private NotifyIcon CreateTrayIcon()
	{
		ContextMenuStrip menu = new ContextMenuStrip();
		menu.Items.Add("Open Black Spirit Hub", null, delegate
		{
			RestoreFromTray();
		});
		menu.Items.Add("Exit", null, delegate
		{
			forceCloseFromTray = true;
			TrySetTrayVisible(false);
			Close();
		});

		NotifyIcon icon = new NotifyIcon
		{
			Icon = trayAppIcon,
			Text = "Black Spirit Hub",
			ContextMenuStrip = menu,
			Visible = false
		};
		icon.DoubleClick += delegate
		{
			RestoreFromTray();
		};
		return icon;
	}

	private void RestoreFromTray()
	{
		try
		{
			TrySetTrayVisible(false);
			ShowInTaskbar = true;
			Show();
			if (WindowState == FormWindowState.Minimized)
				WindowState = FormWindowState.Normal;
			Activate();
			ApplyTaskbarCouponBadge(couponBadgeCount);
			PostEvent("updateCheckRequested", new { source = "trayRestore" });
		}
		catch (Exception ex)
		{
			logger.Error("Could not restore the app from the system tray.", ex);
		}
	}

	public void RestoreFromExternalLaunch()
	{
		if (InvokeRequired)
		{
			BeginInvoke(RestoreFromExternalLaunch);
			return;
		}

		RestoreFromTray();
	}

	private bool MinimizeToSystemTray()
	{
		try
		{
			if (WindowState == FormWindowState.Maximized)
			{
				WindowState = FormWindowState.Normal;
			}

			if (!TrySetTrayVisible(true))
			{
				WindowState = FormWindowState.Minimized;
				ShowInTaskbar = true;
				return false;
			}

			Hide();
			ShowInTaskbar = false;
			return true;
		}
		catch (Exception ex)
		{
			logger.Error("Could not minimize the app to the system tray.", ex);
			try
			{
				WindowState = FormWindowState.Minimized;
				ShowInTaskbar = true;
			}
			catch
			{
			}

			return false;
		}
	}

	private void ShowDesktopNotification(string title, string message)
	{
		string safeTitle = string.IsNullOrWhiteSpace(title) ? "Black Spirit Hub" : title.Trim();
		string safeMessage = string.IsNullOrWhiteSpace(message) ? "Notification" : message.Trim();
		if (safeTitle.Length > 63)
		{
			safeTitle = safeTitle[..60] + "...";
		}
		if (safeMessage.Length > 255)
		{
			safeMessage = safeMessage[..252] + "...";
		}

		try
		{
			bool wasHidden = !trayIcon.Visible;
			trayIcon.BalloonTipTitle = safeTitle;
			trayIcon.BalloonTipText = safeMessage;
			trayIcon.BalloonTipIcon = ToolTipIcon.Info;
			if (!TrySetTrayVisible(true))
			{
				throw new InvalidOperationException("The system-tray notification icon is unavailable.");
			}
			trayIcon.ShowBalloonTip(8000);
			logger.Info($"Desktop notification requested: {safeTitle}");
			if (wasHidden && Visible)
			{
				System.Windows.Forms.Timer cleanupTimer = new System.Windows.Forms.Timer { Interval = 9000 };
				cleanupTimer.Tick += delegate
				{
					cleanupTimer.Stop();
					cleanupTimer.Dispose();
					if (Visible && ShowInTaskbar)
					{
						TrySetTrayVisible(false);
					}
				};
				cleanupTimer.Start();
			}
		}
		catch (Exception ex)
		{
			logger.Warn("Could not show desktop notification: " + ex.Message);
			throw new InvalidOperationException("Windows could not show the desktop notification.", ex);
		}
	}

	private void SetCouponBadgeCount(int count)
	{
		if (InvokeRequired)
		{
			BeginInvoke(new Action<int>(SetCouponBadgeCount), count);
			return;
		}

		int safeCount = Math.Max(0, count);
		couponBadgeCount = safeCount;
		UpdateTrayCouponBadge(safeCount);
		ApplyTaskbarCouponBadge(safeCount);
	}

	private void ApplyTaskbarCouponBadge(int count)
	{
		if (InvokeRequired)
		{
			BeginInvoke(new Action<int>(ApplyTaskbarCouponBadge), count);
			return;
		}

		int safeCount = Math.Max(0, count);
		try
		{
			if (taskbarList == null)
			{
				object taskbarObject = new CTaskbarList();
				taskbarList = (ITaskbarList3)taskbarObject;
			}
			taskbarList.HrInit();
			taskbarBadgeIcon?.Dispose();
			taskbarBadgeIcon = null;
			if (safeCount <= 0)
			{
				taskbarList.SetOverlayIcon(Handle, IntPtr.Zero, string.Empty);
				return;
			}

			taskbarBadgeIcon = CreateCouponNumberBadgeIcon(Math.Min(safeCount, 99));
			taskbarList.SetOverlayIcon(Handle, taskbarBadgeIcon.Handle, safeCount == 1 ? "1 new coupon" : $"{safeCount} new coupons");
		}
		catch (Exception ex)
		{
			logger.Warn("Could not update taskbar coupon badge: " + ex.Message);
		}
	}

	private void UpdateTrayCouponBadge(int count)
	{
		try
		{
			Icon? previousBadge = trayBadgeIcon;
			trayBadgeIcon = null;
			if (count <= 0)
			{
				trayIcon.Icon = trayAppIcon;
				trayIcon.Text = "Black Spirit Hub";
				previousBadge?.Dispose();
				return;
			}

			trayBadgeIcon = CreateTrayIconWithCouponDot(trayAppIcon);
			trayIcon.Icon = trayBadgeIcon;
			trayIcon.Text = count == 1 ? "Black Spirit Hub - 1 new coupon" : "Black Spirit Hub - new coupons available";
			previousBadge?.Dispose();
		}
		catch (Exception ex)
		{
			logger.Warn("Could not update system tray coupon badge: " + ex.Message);
		}
	}

	private bool TrySetTrayVisible(bool visible)
	{
		try
		{
			trayIcon.Visible = visible;
			return true;
		}
		catch (Exception ex)
		{
			logger.Warn("Could not change system tray visibility: " + ex.Message);
			return false;
		}
	}

	private static Icon CreateCouponNumberBadgeIcon(int count)
	{
		using Bitmap bitmap = new Bitmap(32, 32, System.Drawing.Imaging.PixelFormat.Format32bppArgb);
		using Graphics graphics = Graphics.FromImage(bitmap);
		graphics.SmoothingMode = SmoothingMode.AntiAlias;
		graphics.Clear(Color.Transparent);
		using GraphicsPath shadowPath = new GraphicsPath();
		shadowPath.AddEllipse(2, 3, 27, 27);
		using PathGradientBrush shadow = new PathGradientBrush(shadowPath)
		{
			CenterColor = Color.FromArgb(175, 0, 0, 0),
			SurroundColors = new[] { Color.Transparent }
		};
		graphics.FillPath(shadow, shadowPath);
		using LinearGradientBrush fill = new LinearGradientBrush(new Rectangle(2, 1, 28, 28), Color.FromArgb(255, 79, 234, 117), Color.FromArgb(255, 245, 236, 65), LinearGradientMode.ForwardDiagonal);
		using Pen border = new Pen(Color.White, 2.2f);
		graphics.FillEllipse(fill, 2, 1, 28, 28);
		graphics.DrawEllipse(border, 2.5f, 1.5f, 27, 27);
		string text = count > 9 ? "9+" : count.ToString(System.Globalization.CultureInfo.InvariantCulture);
		using Font font = new Font("Segoe UI", text.Length > 1 ? 11.5f : 15f, FontStyle.Bold, GraphicsUnit.Pixel);
		using StringFormat format = new StringFormat { Alignment = StringAlignment.Center, LineAlignment = StringAlignment.Center };
		using Brush textShadow = new SolidBrush(Color.FromArgb(155, 0, 0, 0));
		using Brush textBrush = new SolidBrush(Color.FromArgb(20, 28, 16));
		RectangleF textRect = new RectangleF(2, 1, 28, 27);
		graphics.DrawString(text, font, textShadow, new RectangleF(textRect.X + 1, textRect.Y + 1, textRect.Width, textRect.Height), format);
		graphics.DrawString(text, font, textBrush, textRect, format);
		IntPtr handle = bitmap.GetHicon();
		try
		{
			return (Icon)Icon.FromHandle(handle).Clone();
		}
		finally
		{
			DestroyIcon(handle);
		}
	}

	private static Icon CreateTrayIconWithCouponDot(Icon baseIcon)
	{
		int size = Math.Clamp(Math.Max(baseIcon.Width, baseIcon.Height), 16, 32);
		using Bitmap bitmap = new Bitmap(size, size, System.Drawing.Imaging.PixelFormat.Format32bppArgb);
		using Graphics graphics = Graphics.FromImage(bitmap);
		graphics.SmoothingMode = SmoothingMode.AntiAlias;
		graphics.Clear(Color.Transparent);
		graphics.DrawIcon(baseIcon, new Rectangle(0, 0, size, size));
		float dotSize = Math.Max(6f, size * 0.35f);
		DrawCouponDot(
			graphics,
			new RectangleF(size - dotSize - 1f, 1f, dotSize, dotSize),
			Math.Max(1f, size / 20f));
		IntPtr handle = bitmap.GetHicon();
		try
		{
			return (Icon)Icon.FromHandle(handle).Clone();
		}
		finally
		{
			DestroyIcon(handle);
		}
	}

	private static void DrawCouponDot(Graphics graphics, RectangleF bounds, float borderWidth)
	{
		using GraphicsPath shadowPath = new GraphicsPath();
		shadowPath.AddEllipse(bounds.X - 2f, bounds.Y + 1.5f, bounds.Width + 4f, bounds.Height + 4f);
		using PathGradientBrush shadow = new PathGradientBrush(shadowPath)
		{
			CenterColor = Color.FromArgb(135, 0, 0, 0),
			SurroundColors = new[] { Color.Transparent }
		};
		graphics.FillPath(shadow, shadowPath);
		using LinearGradientBrush fill = new LinearGradientBrush(Rectangle.Round(bounds), Color.FromArgb(255, 255, 242, 69), Color.FromArgb(255, 255, 170, 26), LinearGradientMode.ForwardDiagonal);
		using Pen border = new Pen(Color.White, borderWidth);
		graphics.FillEllipse(fill, bounds);
		graphics.DrawEllipse(border, bounds.X, bounds.Y, bounds.Width, bounds.Height);
	}

	private object PlayAlarmSound()
	{
		string alarmPath = Path.Combine(AppContext.BaseDirectory, "Assets", "Alarm.mp3");
		if (!File.Exists(alarmPath))
		{
			throw new FileNotFoundException("Alarm.mp3 is missing from the application installation.", alarmPath);
		}

		StopAlarmSound();
		string alias = "bdoAlarm" + Interlocked.Increment(ref alarmPlayId).ToString(System.Globalization.CultureInfo.InvariantCulture);
		string safePath = alarmPath.Replace("\"", "");
		try
		{
			SendMciCommand($"open \"{safePath}\" type mpegvideo alias {alias}");
			SendMciCommand($"setaudio {alias} volume to {DefaultAlarmMciVolume}");
			StringBuilder lengthText = new StringBuilder(32);
			SendMciCommand($"status {alias} length", lengthText);
			int durationMilliseconds = int.TryParse(
				lengthText.ToString(),
				System.Globalization.NumberStyles.Integer,
				System.Globalization.CultureInfo.InvariantCulture,
				out int parsedDuration)
					? parsedDuration
					: 3000;
			SendMciCommand($"play {alias} from 0");
			StringBuilder modeText = new StringBuilder(32);
			SendMciCommand($"status {alias} mode", modeText);
			if (!string.Equals(modeText.ToString().Trim(), "playing", StringComparison.OrdinalIgnoreCase))
			{
				throw new InvalidOperationException("Windows opened Alarm.mp3 but did not start playback.");
			}

			activeAlarmAlias = alias;
			alarmCleanupTimer = new System.Windows.Forms.Timer
			{
				Interval = Math.Clamp(durationMilliseconds + 1000, 1500, 60000)
			};
			alarmCleanupTimer.Tick += (_, _) => StopAlarmSound();
			alarmCleanupTimer.Start();
			logger.Info($"Alarm playback started ({durationMilliseconds} ms).");
			return new
			{
				played = true,
				fileName = "Alarm.mp3",
				durationMilliseconds,
				volumePercent = DefaultAlertVolumePercent
			};
		}
		catch
		{
			mciSendString($"close {alias}", null, 0, IntPtr.Zero);
			throw;
		}
	}

	private void StopAlarmSound()
	{
		alarmCleanupTimer?.Stop();
		alarmCleanupTimer?.Dispose();
		alarmCleanupTimer = null;
		if (string.IsNullOrWhiteSpace(activeAlarmAlias))
		{
			return;
		}

		string alias = activeAlarmAlias;
		activeAlarmAlias = null;
		int result = mciSendString($"close {alias}", null, 0, IntPtr.Zero);
		if (result != 0)
		{
			logger.Warn($"Could not close completed alarm playback: {GetMciErrorText(result)}");
		}
	}

	private static void SendMciCommand(string command, StringBuilder? response = null)
	{
		int result = mciSendString(command, response, response?.Capacity ?? 0, IntPtr.Zero);
		if (result != 0)
		{
			throw new InvalidOperationException($"Windows audio playback failed: {GetMciErrorText(result)}");
		}
	}

	private static string GetMciErrorText(int errorCode)
	{
		StringBuilder errorText = new StringBuilder(256);
		return mciGetErrorString(errorCode, errorText, errorText.Capacity)
			? errorText.ToString()
			: $"MCI error {errorCode}";
	}

	private async Task<object> SpeakTextAsync(string text, CancellationToken cancellationToken)
	{
		string safeText = string.IsNullOrWhiteSpace(text) ? "Black Spirit Hub alert." : text.Trim();
		if (safeText.Length > 500)
		{
			safeText = safeText[..500];
		}

		await speechGate.WaitAsync(cancellationToken);
		try
		{
			TaskCompletionSource<object> completion = new(
				TaskCreationOptions.RunContinuationsAsynchronously);
			Thread speechThread = new Thread(() =>
			{
				object? voice = null;
				try
				{
					Type? voiceType = Type.GetTypeFromProgID("SAPI.SpVoice");
					if (voiceType == null)
					{
						throw new InvalidOperationException("Windows text to speech is not available.");
					}
					voice = Activator.CreateInstance(voiceType);
					if (voice is null)
					{
						throw new InvalidOperationException("Windows text to speech could not be started.");
					}

					voiceType.InvokeMember(
						"Volume",
						System.Reflection.BindingFlags.SetProperty,
						null,
						voice,
						new object[] { DefaultAlertVolumePercent });
					voiceType.InvokeMember(
						"Speak",
						System.Reflection.BindingFlags.InvokeMethod,
						null,
						voice,
						new object[] { safeText, 0 });
					completion.TrySetResult(new
					{
						spoken = true,
						characters = safeText.Length,
						volumePercent = DefaultAlertVolumePercent
					});
				}
				catch (Exception ex)
				{
					completion.TrySetException(
						new InvalidOperationException("Windows text to speech playback failed.", ex));
				}
				finally
				{
					if (voice is not null && Marshal.IsComObject(voice))
					{
						Marshal.FinalReleaseComObject(voice);
					}
				}
			})
			{
				IsBackground = true,
				Name = "Black Spirit Hub TTS"
			};
			speechThread.SetApartmentState(ApartmentState.STA);
			speechThread.Start();

			object result = await completion.Task.WaitAsync(cancellationToken);
			logger.Info($"Text to speech playback completed ({safeText.Length} characters).");
			return result;
		}
		catch (Exception ex) when (ex is not OperationCanceledException)
		{
			logger.Error("Text to speech failed.", ex);
			throw;
		}
		finally
		{
			speechGate.Release();
		}
	}

	protected override CreateParams CreateParams
	{
		get
		{
			CreateParams parameters = base.CreateParams;
			parameters.Style |= WsThickFrame | WsMaximizeBox;
			return parameters;
		}
	}

	protected override void OnHandleCreated(EventArgs e)
	{
		base.OnHandleCreated(e);
		WindowChrome.ApplyDark(this);
		WindowChrome.ApplyRoundedCorners(this);
	}

	protected override void WndProc(ref Message m)
	{
		if (m.Msg == WmNcHitTest && base.WindowState == FormWindowState.Normal)
		{
			Point point = PointToClient(new Point(
				unchecked((short)((long)m.LParam & 0xffff)),
				unchecked((short)(((long)m.LParam >> 16) & 0xffff))));
			int border = Math.Max(ResizeBorder, (int)Math.Round(ResizeBorder * DeviceDpi / 96d));
			int corner = Math.Max(ResizeCorner, (int)Math.Round(ResizeCorner * DeviceDpi / 96d));
			bool left = point.X >= 0 && point.X <= border;
			bool right = point.X <= ClientSize.Width && point.X >= ClientSize.Width - border;
			bool top = point.Y >= 0 && point.Y <= border;
			bool bottom = point.Y <= ClientSize.Height && point.Y >= ClientSize.Height - border;

			if (point.X <= corner && point.Y <= corner)
				m.Result = (IntPtr)HtTopLeft;
			else if (point.X >= ClientSize.Width - corner && point.Y <= corner)
				m.Result = (IntPtr)HtTopRight;
			else if (point.X <= corner && point.Y >= ClientSize.Height - corner)
				m.Result = (IntPtr)HtBottomLeft;
			else if (point.X >= ClientSize.Width - corner && point.Y >= ClientSize.Height - corner)
				m.Result = (IntPtr)HtBottomRight;
			else if (left)
				m.Result = (IntPtr)HtLeft;
			else if (right)
				m.Result = (IntPtr)HtRight;
			else if (top)
				m.Result = (IntPtr)HtTop;
			else if (bottom)
				m.Result = (IntPtr)HtBottom;
			else
			{
				base.WndProc(ref m);
			}
			return;
		}
		base.WndProc(ref m);
	}

	protected override async void OnShown(EventArgs e)
	{
		base.OnShown(e);
		startupSplash.StartColdLaunch();
		await InitializeAsync();
	}

	protected override void OnFormClosing(FormClosingEventArgs e)
	{
		if (ShouldMinimizeToTrayOnClose(forceCloseFromTray, minimizeToTray, e.CloseReason))
		{
			e.Cancel = true;
			MinimizeToSystemTray();
			return;
		}
		webViewClosing = true;
		webViewGeneration++;
		CancelActiveBridgeRequests();
		lifetimeCancellation.Cancel();
		startupSplash.Stop();
		base.OnFormClosing(e);
	}

	internal static bool ShouldMinimizeToTrayOnClose(bool forceClose, bool minimizeEnabled, CloseReason closeReason)
	{
		return !forceClose && minimizeEnabled && closeReason == CloseReason.UserClosing;
	}

	protected override void OnFormClosed(FormClosedEventArgs e)
	{
		try { SetCouponBadgeCount(0); } catch { }
		try { marketService?.Dispose(); } catch { }
		try { grindMarketPriceProvider.Dispose(); } catch { }
		try { couponService.Dispose(); } catch { }
		try { eventService.Dispose(); } catch { }
		try { bossScheduleService.Dispose(); } catch { }
		try { playerGuildService.Dispose(); } catch { }
		try { dehkiaFuelService.Dispose(); } catch { }
		try { recipeBookScreenshotService.Dispose(); } catch { }
		try { updateCheckerService.Dispose(); } catch { }
		TrySetTrayVisible(false);
		try { trayIcon.Dispose(); } catch { }
		try { taskbarBadgeIcon?.Dispose(); } catch { }
		try { trayBadgeIcon?.Dispose(); } catch { }
		try { trayAppIcon.Dispose(); } catch { }
		try { startupSplash.Dispose(); } catch { }
		try { appIcon.Dispose(); } catch { }
		try { backgroundNotificationTimer?.Stop(); } catch { }
		try { backgroundNotificationTimer?.Dispose(); } catch { }
		try { StopAlarmSound(); } catch { }
		DisposeEventsBrowser();
		DetachMainWebViewEvents(webView);
		try { webView.Dispose(); } catch { }
		try { lifetimeCancellation.Dispose(); } catch { }
		base.OnFormClosed(e);
	}

	private async Task InitializeAsync()
	{
		int startupWebViewGeneration = webViewGeneration;
		try
		{
			CancellationToken cancellationToken = lifetimeCancellation.Token;
			minimizeToTray = (await AppBehaviorSettings.LoadAsync(paths, cancellationToken)).MinimizeToTray;
			BlackDesertMarketProvider provider = new BlackDesertMarketProvider(logger);
			marketService = new MarketAnalyticsService(marketDatabase, provider, logger);
			marketService.DataChanged += delegate
			{
				PostEvent("dataChanged", null);
			};
			marketService.StatusChanged += delegate(object? _, string message)
			{
				PostEvent("status", new { message });
			};
			// Microsoft.Data.Sqlite performs much of its startup work synchronously.
			// Keep schema/settings initialization off the UI thread so the native
			// startup animation can maintain a steady compositor cadence.
			marketInitializationTask = Task.Run(
				() => marketService.InitializeAsync(cancellationToken),
				cancellationToken);
			_ = marketInitializationTask.ContinueWith(
				task => logger.Error("Market Analytics initialization failed.", task.Exception?.GetBaseException() ?? new InvalidOperationException("Unknown market initialization failure.")),
				default,
				TaskContinuationOptions.OnlyOnFaulted,
				TaskScheduler.Default);
			await InitializeMainWebViewControlAsync(webView, webViewGeneration, cancellationToken);
			StartBackgroundNotificationTimer();
		}
		catch (OperationCanceledException) when (lifetimeCancellation.IsCancellationRequested)
		{
		}
		catch (Exception ex) when (startupWebViewGeneration != webViewGeneration)
		{
			logger.Warn("Stale startup WebView initialization ended after the control was replaced: " + ex.Message);
		}
		catch (Exception ex)
		{
			logger.Error("Application startup failed.", ex);
			ShowError("Could not start Black Spirit Hub." + Environment.NewLine + Environment.NewLine + ex.Message);
		}
	}

	private async Task InitializeMainWebViewControlAsync(
		WebView2 target,
		int generation,
		CancellationToken cancellationToken)
	{
		logger.Info($"WebView generation {generation}: creating environment.");
		CoreWebView2Environment environment = await CoreWebView2Environment.CreateAsync(null, paths.WebViewDataPath);
		ThrowIfStaleWebView(target, generation, cancellationToken);
		await target.EnsureCoreWebView2Async(environment);
		ThrowIfStaleWebView(target, generation, cancellationToken);

		CoreWebView2 core = target.CoreWebView2
			?? throw new InvalidOperationException("The WebView2 controller did not initialize.");
		ConfigureMainWebView(core);
		logger.Info($"WebView generation {generation}: controller ready.");

		TaskCompletionSource<bool> navigationReady = new(TaskCreationOptions.RunContinuationsAsynchronously);
		void NavigationCompleted(object? _, CoreWebView2NavigationCompletedEventArgs args)
		{
			if (args.IsSuccess)
				navigationReady.TrySetResult(true);
			else
				navigationReady.TrySetException(
					new InvalidOperationException($"The interface could not be loaded ({args.WebErrorStatus})."));
		}

		core.NavigationCompleted += NavigationCompleted;
		try
		{
			string url = $"https://{LocalAppHost}/{Path.GetFileName(paths.HtmlPath)}?v={Uri.EscapeDataString(AppVersion.Current + "-" + UiRevision)}";
			logger.Info($"WebView generation {generation}: navigating local interface.");
			core.Navigate(url);
			await navigationReady.Task.WaitAsync(TimeSpan.FromSeconds(20), cancellationToken);
			ThrowIfStaleWebView(target, generation, cancellationToken);
			string healthJson = await core.ExecuteScriptAsync(
				"Boolean(document.readyState === 'complete' && document.body)");
			if (!JsonSerializer.Deserialize<bool>(healthJson, JsonOptions))
				throw new InvalidOperationException("The interface loaded without a usable document.");
		}
		finally
		{
			try { core.NavigationCompleted -= NavigationCompleted; } catch { }
		}

		ThrowIfStaleWebView(target, generation, cancellationToken);
		target.Visible = true;
		startupSplash.BringToFront();
		startupSplash.MarkApplicationReady();
		recentUnresponsiveFailures = 0;
		logger.Info($"WebView generation {generation}: interface ready.");
	}

	private void ConfigureMainWebView(CoreWebView2 core)
	{
		core.SetVirtualHostNameToFolderMapping(LocalAppHost, paths.Root, CoreWebView2HostResourceAccessKind.DenyCors);
		string recipeBookAssets = Path.Combine(AppContext.BaseDirectory, "Assets", "RecipeBook");
		if (!Directory.Exists(recipeBookAssets))
		{
			throw new DirectoryNotFoundException("The offline Recipe Book assets are missing.");
		}
		core.SetVirtualHostNameToFolderMapping(
			RecipeBookHost,
			recipeBookAssets,
			CoreWebView2HostResourceAccessKind.Allow);
		core.Settings.AreDevToolsEnabled = false;
		core.Settings.AreDefaultContextMenusEnabled = false;
		core.Settings.IsStatusBarEnabled = false;
		core.NavigationStarting += OnMainNavigationStarting;
		core.NewWindowRequested += OnMainNewWindowRequested;
		core.PermissionRequested += OnMainPermissionRequested;
		core.WebMessageReceived += OnWebMessageReceived;
		core.DocumentTitleChanged += OnMainDocumentTitleChanged;
		core.ProcessFailed += OnMainProcessFailed;
	}

	private void DetachMainWebViewEvents(WebView2 target)
	{
		try
		{
			CoreWebView2? core = target.CoreWebView2;
			if (core is null)
				return;
			core.NavigationStarting -= OnMainNavigationStarting;
			core.NewWindowRequested -= OnMainNewWindowRequested;
			core.PermissionRequested -= OnMainPermissionRequested;
			core.WebMessageReceived -= OnWebMessageReceived;
			core.DocumentTitleChanged -= OnMainDocumentTitleChanged;
			core.ProcessFailed -= OnMainProcessFailed;
		}
		catch
		{
			// A failed browser process can close the controller before handlers are detached.
		}
	}

	private void OnMainNavigationStarting(object? sender, CoreWebView2NavigationStartingEventArgs args)
	{
		if (!IsTrustedLocalUi(args.Uri))
			args.Cancel = true;
	}

	private static void OnMainNewWindowRequested(object? sender, CoreWebView2NewWindowRequestedEventArgs args)
	{
		args.Handled = true;
	}

	private static void OnMainPermissionRequested(object? sender, CoreWebView2PermissionRequestedEventArgs args)
	{
		args.State = CoreWebView2PermissionState.Deny;
	}

	private void OnMainDocumentTitleChanged(object? sender, object args)
	{
		if (sender is not CoreWebView2 core || !ReferenceEquals(core, webView.CoreWebView2))
			return;
		string documentTitle = core.DocumentTitle;
		if (!string.IsNullOrWhiteSpace(documentTitle))
			Text = documentTitle;
	}

	private void ThrowIfStaleWebView(WebView2 target, int generation, CancellationToken cancellationToken)
	{
		cancellationToken.ThrowIfCancellationRequested();
		if (webViewClosing
			|| generation != webViewGeneration
			|| !ReferenceEquals(target, webView)
			|| target.IsDisposed)
		{
			throw new OperationCanceledException("The WebView was replaced while it was initializing.", cancellationToken);
		}
	}

	internal enum WebViewRecoveryAction
	{
		None,
		CheckHealth,
		Recreate,
		ShowIntegrityError
	}

	internal static WebViewRecoveryAction DecideWebViewRecovery(
		CoreWebView2ProcessFailedKind kind,
		CoreWebView2ProcessFailedReason reason,
		int unresponsiveFailureCount)
	{
		if (reason == CoreWebView2ProcessFailedReason.IntegrityFailure)
			return WebViewRecoveryAction.ShowIntegrityError;

		return kind switch
		{
			CoreWebView2ProcessFailedKind.BrowserProcessExited
				or CoreWebView2ProcessFailedKind.RenderProcessExited => WebViewRecoveryAction.Recreate,
			CoreWebView2ProcessFailedKind.GpuProcessExited
				or CoreWebView2ProcessFailedKind.UnknownProcessExited => WebViewRecoveryAction.CheckHealth,
			CoreWebView2ProcessFailedKind.RenderProcessUnresponsive when unresponsiveFailureCount >= 2
				=> WebViewRecoveryAction.Recreate,
			_ => WebViewRecoveryAction.None
		};
	}

	private void OnMainProcessFailed(object? sender, CoreWebView2ProcessFailedEventArgs args)
	{
		CoreWebView2ProcessFailedKind kind = args.ProcessFailedKind;
		CoreWebView2ProcessFailedReason reason = args.Reason;
		int exitCode = args.ExitCode;
		string description = args.ProcessDescription ?? string.Empty;
		string modulePath = args.FailureSourceModulePath ?? string.Empty;
		int generation = webViewGeneration;

		logger.Warn(
			$"WebView process failed: generation={generation}, kind={kind}, reason={reason}, "
			+ $"exit={exitCode}, description={description}, module={modulePath}");
		if (webViewClosing || sender is not CoreWebView2 failedCore)
			return;

		try
		{
			if (!ReferenceEquals(failedCore, webView.CoreWebView2))
				return;
		}
		catch
		{
			return;
		}

		if (kind == CoreWebView2ProcessFailedKind.RenderProcessUnresponsive)
		{
			DateTime now = DateTime.UtcNow;
			if (now - lastUnresponsiveFailureUtc > TimeSpan.FromSeconds(60))
				recentUnresponsiveFailures = 0;
			lastUnresponsiveFailureUtc = now;
			recentUnresponsiveFailures++;
		}
		else
		{
			recentUnresponsiveFailures = 0;
		}

		WebViewRecoveryAction action = DecideWebViewRecovery(kind, reason, recentUnresponsiveFailures);
		if (action == WebViewRecoveryAction.None)
			return;

		void Recover()
		{
			if (webViewClosing || generation != webViewGeneration || IsDisposed)
				return;
			if (action == WebViewRecoveryAction.ShowIntegrityError)
			{
				ShowError(
					"Microsoft WebView2 was blocked by Windows code-integrity protection."
					+ Environment.NewLine + Environment.NewLine
					+ (string.IsNullOrWhiteSpace(modulePath) ? string.Empty : modulePath + Environment.NewLine + Environment.NewLine)
					+ "Repair Microsoft Edge WebView2 Runtime, then restart Black Spirit Hub.");
				return;
			}
			if (action == WebViewRecoveryAction.CheckHealth)
			{
				_ = CheckMainWebViewHealthAndRecoverAsync($"{kind} ({reason})", generation);
				return;
			}

			QueueMainWebViewRecreation($"{kind} ({reason})", generation);
		}

		try
		{
			// Always queue out of ProcessFailed. Disposing or recreating the
			// controller from inside its failure callback is re-entrant and unsafe.
			BeginInvoke((Action)Recover);
		}
		catch (InvalidOperationException)
		{
			// The window was closed while the browser failure was being reported.
		}
	}

	private async Task CheckMainWebViewHealthAndRecoverAsync(string reason, int generation)
	{
		if (webViewHealthCheckActive
			|| webViewRecoveryActive
			|| webViewClosing
			|| generation != webViewGeneration)
		{
			return;
		}

		webViewHealthCheckActive = true;
		bool healthy = false;
		try
		{
			await Task.Delay(1200, lifetimeCancellation.Token);
			if (webViewClosing || generation != webViewGeneration || webView.IsDisposed)
				return;
			CoreWebView2? core = webView.CoreWebView2;
			if (core is not null)
			{
				string result = await core.ExecuteScriptAsync(
					"Boolean(document.readyState === 'complete' && document.body)")
					.WaitAsync(TimeSpan.FromSeconds(8), lifetimeCancellation.Token);
				healthy = JsonSerializer.Deserialize<bool>(result, JsonOptions);
			}
		}
		catch (OperationCanceledException) when (lifetimeCancellation.IsCancellationRequested)
		{
			return;
		}
		catch (Exception ex)
		{
			logger.Warn("WebView health check failed after " + reason + ": " + ex.Message);
		}
		finally
		{
			webViewHealthCheckActive = false;
		}

		if (healthy)
		{
			logger.Info("WebView remained healthy after " + reason + "; no recreation was needed.");
			return;
		}
		if (!webViewClosing && generation == webViewGeneration)
			QueueMainWebViewRecreation(reason + "; interface health check failed", generation);
	}

	private void QueueMainWebViewRecreation(string reason, int failedGeneration)
	{
		if (webViewClosing || IsDisposed || failedGeneration != webViewGeneration || webViewRecoveryActive)
			return;

		DateTime now = DateTime.UtcNow;
		while (webViewRecoveryHistory.Count > 0
			&& now - webViewRecoveryHistory.Peek() > TimeSpan.FromMinutes(5))
		{
			webViewRecoveryHistory.Dequeue();
		}
		if (webViewRecoveryHistory.Count >= 3)
		{
			logger.Warn("WebView automatic recovery stopped after three attempts in five minutes.");
			ShowError(
				"The interface stopped repeatedly and automatic recovery was paused."
				+ Environment.NewLine + Environment.NewLine
				+ "Please restart Black Spirit Hub. If this continues, use the installer's WebView2 repair option.");
			return;
		}

		webViewRecoveryHistory.Enqueue(now);
		webViewRecoveryActive = true;
		_ = RecreateMainWebViewAsync(reason, failedGeneration);
	}

	private async Task RecreateMainWebViewAsync(string reason, int failedGeneration)
	{
		try
		{
			logger.Warn($"Recreating WebView generation {failedGeneration}: {reason}.");
			backgroundNotificationTimer?.Stop();
			startupSplash.ShowRestoring("Restoring Black Spirit Hub...");
			CancelActiveBridgeRequests();

			WebView2 oldWebView = webView;
			DetachMainWebViewEvents(oldWebView);
			try { Controls.Remove(oldWebView); } catch { }
			try { oldWebView.Dispose(); } catch { }

			if (webViewClosing || lifetimeCancellation.IsCancellationRequested)
				return;

			webViewGeneration++;
			int newGeneration = webViewGeneration;
			WebView2 replacement = CreateMainWebViewControl();
			webView = replacement;
			Controls.Add(replacement);
			replacement.SendToBack();
			startupSplash.BringToFront();

			await Task.Delay(400, lifetimeCancellation.Token);
			await InitializeMainWebViewControlAsync(replacement, newGeneration, lifetimeCancellation.Token);
			StartBackgroundNotificationTimer();
			logger.Info($"WebView recovery succeeded: generation {newGeneration}.");
		}
		catch (OperationCanceledException) when (webViewClosing || lifetimeCancellation.IsCancellationRequested)
		{
		}
		catch (Exception ex)
		{
			logger.Error("WebView recovery failed.", ex);
			ShowError(
				"Black Spirit Hub could not restore its interface."
				+ Environment.NewLine + Environment.NewLine
				+ ex.Message
				+ Environment.NewLine + Environment.NewLine
				+ "Restart the app or use the installer's WebView2 repair option.");
		}
		finally
		{
			webViewRecoveryActive = false;
		}
	}

	private void CancelActiveBridgeRequests()
	{
		foreach (CancellationTokenSource request in activeBridgeRequests.Values)
		{
			try { request.Cancel(); } catch { }
		}
	}

	private async Task<MarketAnalyticsService> GetMarketServiceAsync(CancellationToken cancellationToken)
	{
		MarketAnalyticsService service = marketService ?? throw new InvalidOperationException("Market Analytics is not ready.");
		if (marketInitializationTask is not null)
		{
			await marketInitializationTask.WaitAsync(cancellationToken);
		}
		return service;
	}

	private void StartBackgroundNotificationTimer()
	{
		backgroundNotificationTimer?.Stop();
		backgroundNotificationTimer?.Dispose();
		backgroundNotificationTimer = new System.Windows.Forms.Timer
		{
			Interval = 10_000
		};
		backgroundNotificationTimer.Tick += async (_, _) => await TickBackgroundNotificationsAsync();
		backgroundNotificationTimer.Start();
		_ = TickBackgroundNotificationsAsync();
	}

	private async Task TickBackgroundNotificationsAsync()
	{
		if (Interlocked.Exchange(ref backgroundNotificationTickActive, 1) != 0)
		{
			return;
		}
		try
		{
			if (!IsDisposed && webView.CoreWebView2 is not null)
			{
				await webView.CoreWebView2.ExecuteScriptAsync(
					"window.__bdoRunBackgroundNotifications?.();");
			}
		}
		catch (Exception ex) when (ex is InvalidOperationException or COMException)
		{
			logger.Warn("Background notification tick was skipped: " + ex.Message);
		}
		catch (Exception ex)
		{
			logger.Error("Background notification tick failed.", ex);
		}
		finally
		{
			Volatile.Write(ref backgroundNotificationTickActive, 0);
		}
	}

	public void ExitForUpdate()
	{
		if (IsDisposed)
		{
			return;
		}
		void Exit()
		{
			forceCloseFromTray = true;
			minimizeToTray = false;
			TrySetTrayVisible(false);
			Close();
		}
		if (InvokeRequired)
		{
			BeginInvoke((Action)Exit);
		}
		else
		{
			Exit();
		}
	}

	private async void OnWebMessageReceived(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
	{
		string? requestId = null;
		string? requestKey = null;
		CancellationTokenSource? requestCancellation = null;
		bool requestRegistered = false;
		int requestGeneration = webViewGeneration;
		try
		{
			if (sender is not CoreWebView2 requestCore
				|| !ReferenceEquals(requestCore, webView.CoreWebView2))
			{
				return;
			}
			using JsonDocument document = JsonDocument.Parse(e.WebMessageAsJson);
			if (!IsTrustedLocalUi(e.Source))
			{
				throw new InvalidOperationException("The request did not originate from the local application interface.");
			}
			JsonElement rootElement = document.RootElement;
			requestId = rootElement.GetProperty("id").GetString();
			string command = rootElement.GetProperty("command").GetString() ?? "";
			JsonElement value;
			JsonElement payload = (rootElement.TryGetProperty("payload", out value) ? value : default(JsonElement));
			if (string.Equals(command, "cancelRequest", StringComparison.Ordinal))
			{
				string targetId = payload.TryGetProperty("requestId", out JsonElement target) ? target.GetString() ?? string.Empty : string.Empty;
				string targetKey = GetBridgeRequestKey(requestGeneration, targetId);
				if (activeBridgeRequests.TryGetValue(targetKey, out CancellationTokenSource? active))
				{
					active.Cancel();
				}
				PostResponse(requestGeneration, requestId, ok: true, new { cancelled = !string.IsNullOrWhiteSpace(targetId) }, null);
				return;
			}

			requestCancellation = CancellationTokenSource.CreateLinkedTokenSource(lifetimeCancellation.Token);
			requestCancellation.CancelAfter(GetCommandTimeout(command));
			requestKey = GetBridgeRequestKey(requestGeneration, requestId);
			if (string.IsNullOrWhiteSpace(requestId) || !activeBridgeRequests.TryAdd(requestKey, requestCancellation))
			{
				throw new InvalidOperationException("The request identifier is invalid or already active.");
			}
			requestRegistered = true;

			PostResponse(
				requestGeneration,
				requestId,
				ok: true,
				await ExecuteCommandAsync(command, payload, requestCancellation.Token),
				null);
		}
		catch (OperationCanceledException)
		{
			PostResponse(requestGeneration, requestId, ok: false, null, "The request timed out or was cancelled.");
		}
		catch (Exception ex)
		{
			logger.Error("Application command failed.", ex);
			PostResponse(requestGeneration, requestId, ok: false, null, ex.Message);
		}
		finally
		{
			if (requestRegistered && !string.IsNullOrWhiteSpace(requestKey))
			{
				activeBridgeRequests.TryRemove(requestKey, out _);
			}
			requestCancellation?.Dispose();
		}
	}

	private static string GetBridgeRequestKey(int generation, string? requestId)
	{
		return generation.ToString(System.Globalization.CultureInfo.InvariantCulture)
			+ ":"
			+ (requestId ?? string.Empty);
	}

	internal static TimeSpan GetCommandTimeout(string command)
	{
		return command switch
		{
			"downloadAndInstallUpdate" => TimeSpan.FromMinutes(10),
			"refreshEvents" or "initializeEvents" => TimeSpan.FromSeconds(105),
			"refreshBossSchedule" => TimeSpan.FromSeconds(20),
			"getBdoPlayerProfile" => TimeSpan.FromSeconds(70),
			"searchBdoPlayersGuilds" or "getBdoGuildProfile" => TimeSpan.FromSeconds(33),
			"getDehkiaFuelData" => TimeSpan.FromSeconds(90),
			"analyzeRecipeBookScreenshot" => TimeSpan.FromSeconds(90),
			"healthCheck" => TimeSpan.FromSeconds(6),
			_ => TimeSpan.FromSeconds(45)
		};
	}

	private async Task<object?> ExecuteCommandAsync(string command, JsonElement payload, CancellationToken cancellationToken)
	{
		switch (command)
		{
		case "windowMinimize":
			base.WindowState = FormWindowState.Minimized;
			return new
			{
				state = "minimized"
			};
		case "windowToggleMaximize":
			base.WindowState = ((base.WindowState != FormWindowState.Maximized) ? FormWindowState.Maximized : FormWindowState.Normal);
			return new
			{
				state = ((base.WindowState == FormWindowState.Maximized) ? "maximized" : "normal")
			};
		case "windowClose":
			BeginInvoke(new Action(Close));
			return new
			{
				state = "closing"
			};
		case "healthCheck":
		{
			ValidateHealthCheckPayload(payload);
			MarketAnalyticsService service = await GetMarketServiceAsync(cancellationToken);
			return await appHealthService.CheckAsync(service.GetRefreshHealth(), cancellationToken);
		}
		case "getDehkiaFuelData":
		{
			bool forceRefresh = payload.ValueKind == JsonValueKind.Object
				&& payload.TryGetProperty("forceRefresh", out JsonElement forceRefreshValue)
				&& forceRefreshValue.ValueKind is JsonValueKind.True or JsonValueKind.False
				&& forceRefreshValue.GetBoolean();
			return await dehkiaFuelService.GetDataAsync(forceRefresh, cancellationToken);
		}
		case "analyzeRecipeBookScreenshot":
		{
			RecipeBookScreenshotRequest request = RecipeBookScreenshotService.ParsePayload(payload);
			return await recipeBookScreenshotService.AnalyzeAsync(request, cancellationToken);
		}
		case "windowDrag":
			ReleaseCapture();
			SendMessage(base.Handle, 161, 2, 0);
			return new
			{
				state = "dragging"
			};
		case "openExternalUrl":
		{
			string url = payload.TryGetProperty("url", out JsonElement urlValue)
				? urlValue.GetString() ?? string.Empty
				: string.Empty;
			if (!Uri.TryCreate(url, UriKind.Absolute, out Uri? uri)
				|| uri.Scheme != Uri.UriSchemeHttps
				|| !IsAllowedExternalHost(uri.Host))
			{
				throw new InvalidOperationException("That external link is not allowed.");
			}
			Process.Start(new ProcessStartInfo(uri.AbsoluteUri)
			{
				UseShellExecute = true
			});
			return new { opened = true };
		}
		case "initializeCoupons":
			return await couponService.InitializeAsync(cancellationToken);
		case "refreshCoupons":
			return await couponService.RefreshAsync(cancellationToken);
		case "initializeEvents":
			return await LoadEventsWithBrowserFallbackAsync(forceRefresh: false, cancellationToken);
		case "refreshEvents":
			return await LoadEventsWithBrowserFallbackAsync(forceRefresh: true, cancellationToken);
		case "initializeBossSchedule":
			return await bossScheduleService.InitializeAsync(cancellationToken);
		case "refreshBossSchedule":
			return await bossScheduleService.RefreshAsync(cancellationToken);
		case "searchBdoPlayersGuilds":
			return await playerGuildService.SearchAsync(
				payload.TryGetProperty("mode", out JsonElement searchMode)
					? searchMode.GetString() ?? string.Empty
					: string.Empty,
				payload.TryGetProperty("region", out JsonElement searchRegion)
					? searchRegion.GetString() ?? string.Empty
					: string.Empty,
				payload.TryGetProperty("query", out JsonElement searchQuery)
					? searchQuery.GetString() ?? string.Empty
					: string.Empty,
				cancellationToken);
		case "getBdoGuildProfile":
			return await playerGuildService.GetGuildProfileAsync(
				payload.TryGetProperty("region", out JsonElement guildRegion)
					? guildRegion.GetString() ?? string.Empty
					: string.Empty,
				payload.TryGetProperty("guildName", out JsonElement guildName)
					? guildName.GetString() ?? string.Empty
					: string.Empty,
				cancellationToken,
				payload.TryGetProperty("forceRefresh", out JsonElement guildForceRefresh)
					&& guildForceRefresh.ValueKind == JsonValueKind.True);
		case "getBdoPlayerProfile":
			return await playerGuildService.GetPlayerProfileAsync(
				payload.TryGetProperty("region", out JsonElement playerRegion)
					? playerRegion.GetString() ?? string.Empty
					: string.Empty,
				payload.TryGetProperty("familyName", out JsonElement familyName)
					? familyName.GetString() ?? string.Empty
					: string.Empty,
				cancellationToken,
				payload.TryGetProperty("forceRefresh", out JsonElement playerForceRefresh)
					&& playerForceRefresh.ValueKind == JsonValueKind.True);
		case "getAppVersion":
			return new { version = AppVersion.Current };
		case "checkForUpdates":
			return await updateCheckerService.CheckAsync(cancellationToken);
		case "downloadAndInstallUpdate":
			return await DownloadAndLaunchUpdateInstallerAsync(cancellationToken);
		case "saveCouponSettings":
		{
			CouponSettings settings = JsonSerializer.Deserialize<CouponSettings>(payload.GetRawText(), JsonOptions)
				?? new CouponSettings(true, true, "", "all");
			return await couponService.SaveSettingsAsync(settings, cancellationToken);
		}
		case "setCouponBadgeCount":
		{
			int count = payload.TryGetProperty("count", out JsonElement countValue) && countValue.TryGetInt32(out int parsedCount)
				? parsedCount
				: 0;
			SetCouponBadgeCount(count);
			return new { count = Math.Max(0, count) };
		}
		case "getAppBehaviorSettings":
			return new AppBehaviorSettings(minimizeToTray);
		case "saveAppBehaviorSettings":
		{
			bool enabled = ReadMinimizeToTraySetting(payload);
			AppBehaviorSettings settings = AppBehaviorSettings.Save(paths, new AppBehaviorSettings(enabled));
			minimizeToTray = settings.MinimizeToTray;
			return settings;
		}
		case "showDesktopNotification":
		{
			string title = payload.TryGetProperty("title", out JsonElement titleValue)
				? titleValue.GetString() ?? "Black Spirit Hub"
				: "Black Spirit Hub";
			string message = payload.TryGetProperty("message", out JsonElement messageValue)
				? messageValue.GetString() ?? string.Empty
				: string.Empty;
			ShowDesktopNotification(title, message);
			return new { shown = true };
		}
		case "playAlarmSound":
			return PlayAlarmSound();
		case "speakText":
		{
			string text = payload.TryGetProperty("text", out JsonElement textValue)
				? textValue.GetString() ?? string.Empty
				: string.Empty;
			return await SpeakTextAsync(text, cancellationToken);
		}
		case "getGrindMarketPrices":
		{
			string region = payload.TryGetProperty("region", out JsonElement regionValue)
				? regionValue.GetString() ?? "eu"
				: "eu";
			List<long> itemIds = new();
			if (payload.TryGetProperty("itemIds", out JsonElement itemValues) && itemValues.ValueKind == JsonValueKind.Array)
			{
				foreach (JsonElement itemValue in itemValues.EnumerateArray())
				{
					long numericId;
					if (itemValue.ValueKind == JsonValueKind.Number && itemValue.TryGetInt64(out numericId))
					{
						itemIds.Add(numericId);
					}
					else if (itemValue.ValueKind == JsonValueKind.String && long.TryParse(itemValue.GetString(), out numericId))
					{
						itemIds.Add(numericId);
					}
				}
			}
			return await grindMarketPriceProvider.GetPricesAsync(itemIds, region, cancellationToken);
		}
		case "getPortraitSettings":
			return await portraitReplacerService.GetSettingsAsync(cancellationToken);
		case "selectFaceTextureFolder":
			return await SelectFaceTextureFolderAsync(payload, cancellationToken);
		case "selectOldPortrait":
			return SelectOldPortrait(payload);
		case "selectNewPortrait":
			return SelectNewPortrait(payload);
		case "previewPortrait":
		{
			string imagePath = payload.GetProperty("newImagePath").GetString() ?? "";
			string cropMode = payload.TryGetProperty("cropMode", out JsonElement cropModeValue) ? cropModeValue.GetString() ?? "crop" : "crop";
			double cropX = payload.TryGetProperty("cropX", out JsonElement cropXValue) ? cropXValue.GetDouble() : 50.0;
			double cropY = payload.TryGetProperty("cropY", out JsonElement cropYValue) ? cropYValue.GetDouble() : 50.0;
			double zoom = payload.TryGetProperty("zoom", out JsonElement zoomValue) ? zoomValue.GetDouble() : 1.0;
			return await Task.Run(
				() => portraitReplacerService.DescribeImage(imagePath, renderFinal: true, cropMode, cropX, cropY, zoom),
				cancellationToken);
		}
		case "replacePortrait":
			return await portraitReplacerService.ReplaceAsync(
				payload.GetProperty("faceTextureFolder").GetString() ?? "",
				payload.GetProperty("oldImagePath").GetString() ?? "",
				payload.GetProperty("newImagePath").GetString() ?? "",
				payload.TryGetProperty("cropMode", out JsonElement replaceCropMode) ? replaceCropMode.GetString() ?? "crop" : "crop",
				payload.TryGetProperty("cropX", out JsonElement replaceCropX) ? replaceCropX.GetDouble() : 50.0,
				payload.TryGetProperty("cropY", out JsonElement replaceCropY) ? replaceCropY.GetDouble() : 50.0,
				payload.TryGetProperty("zoom", out JsonElement replaceZoom) ? replaceZoom.GetDouble() : 1.0,
				cancellationToken);
		case "openPortraitBackupFolder":
			return portraitReplacerService.OpenBackupFolder(payload.GetProperty("faceTextureFolder").GetString() ?? "");
		case "restoreLastPortraitBackup":
			return await portraitReplacerService.RestoreLastBackupAsync(
				payload.GetProperty("faceTextureFolder").GetString() ?? "",
				payload.GetProperty("oldImagePath").GetString() ?? "",
				cancellationToken);
		case "getFontChangerSettings":
			return await fontChangerService.GetSettingsAsync(cancellationToken);
		case "getFontPresets":
			return await Task.Run(fontChangerService.GetPresetGallery, cancellationToken);
		case "selectBdoFolder":
			return await SelectBdoFolderAsync(payload, cancellationToken);
		case "selectCustomFont":
			return await SelectCustomFontAsync(payload, cancellationToken);
		case "applyPresetFont":
			return await fontChangerService.ApplyPresetAsync(
				payload.GetProperty("bdoFolder").GetString() ?? "",
				payload.GetProperty("presetId").GetString() ?? "",
				cancellationToken);
		case "applyCustomFont":
			return await fontChangerService.ApplyCustomAsync(
				payload.GetProperty("bdoFolder").GetString() ?? "",
				payload.GetProperty("fontPath").GetString() ?? "",
				cancellationToken);
		case "restoreLastFontBackup":
			return await fontChangerService.RestoreLastBackupAsync(
				payload.GetProperty("bdoFolder").GetString() ?? "",
				cancellationToken);
		case "removeCustomFont":
			return await fontChangerService.RemoveCustomFontAsync(
				payload.GetProperty("bdoFolder").GetString() ?? "",
				cancellationToken);
		case "openBdoFontFolder":
			return fontChangerService.OpenFontFolder(payload.GetProperty("bdoFolder").GetString() ?? "");
		default:
		{
			MarketAnalyticsService service = await GetMarketServiceAsync(cancellationToken);
			switch (command)
			{
			case "initialize":
			{
				MarketSettings settings = service.Settings;
				string providerName = service.ProviderName;
				return new
				{
					settings = settings,
					provider = providerName,
					items = await service.GetTrackedItemsAsync(cancellationToken)
				};
			}
			case "getRegionState":
			{
				JsonElement value8;
				string region = payload.TryGetProperty("region", out value8) ? value8.GetString() ?? service.Settings.Region : service.Settings.Region;
				return new
				{
					region = region,
					items = await service.GetTrackedItemsAsync(region, cancellationToken),
					outfits = await service.GetOutfitReportAsync(region, cancellationToken)
				};
			}
			case "search":
				return await service.SearchAsync(payload.GetProperty("query").GetString() ?? "", cancellationToken);
			case "getVariants":
				return await service.GetVariantsAsync(payload.GetProperty("itemId").GetInt64(), cancellationToken);
			case "addTracked":
			{
				MarketItem item = JsonSerializer.Deserialize<MarketItem>(payload.GetRawText(), JsonOptions) ?? throw new InvalidDataException("Invalid item selection.");
				await service.AddTrackedItemAsync(item, cancellationToken);
				return await service.GetTrackedItemsAsync(cancellationToken);
			}
			case "removeTracked":
				await service.RemoveTrackedItemAsync(payload.GetProperty("itemId").GetInt64(), payload.GetProperty("enhancement").GetInt32(), cancellationToken);
				return await service.GetTrackedItemsAsync(cancellationToken);
			case "getAnalytics":
			{
				JsonElement value9;
				JsonElement value12;
				string region = payload.TryGetProperty("region", out value12) ? value12.GetString() ?? service.Settings.Region : service.Settings.Region;
				return await service.GetAnalyticsAsync(payload.GetProperty("itemId").GetInt64(), payload.GetProperty("enhancement").GetInt32(), region, payload.TryGetProperty("days", out value9) ? value9.GetInt32() : 30, cancellationToken);
			}
			case "getOutfitReport":
			{
				JsonElement value10;
				string region = payload.TryGetProperty("region", out value10) ? value10.GetString() ?? service.Settings.Region : service.Settings.Region;
				return await service.GetOutfitReportAsync(region, cancellationToken);
			}
			case "exportCsv":
				return await ExportCsvAsync(service, cancellationToken);
			default:
				throw new InvalidOperationException("Unknown command: " + command);
			}
		}
		}
	}

	internal static void ValidateHealthCheckPayload(JsonElement payload)
	{
		if (payload.ValueKind != JsonValueKind.Object || payload.EnumerateObject().Any())
		{
			throw new InvalidOperationException("The health check does not accept arguments.");
		}
	}

	internal static bool ReadMinimizeToTraySetting(JsonElement payload)
	{
		if (!payload.TryGetProperty("minimizeToTray", out JsonElement value)
			|| (value.ValueKind != JsonValueKind.True && value.ValueKind != JsonValueKind.False))
		{
			throw new InvalidOperationException("The close-button setting must include a Boolean minimizeToTray value.");
		}

		return value.GetBoolean();
	}

	private async Task<object> LoadEventsWithBrowserFallbackAsync(bool forceRefresh, CancellationToken cancellationToken)
	{
		object dashboard = forceRefresh
			? await eventService.RefreshAsync(cancellationToken)
			: await eventService.InitializeAsync(cancellationToken);

		if (!ShouldUseEventsBrowserFallback(dashboard, forceRefresh))
			return dashboard;

		try
		{
			logger.Info("Events browser fallback started.");
			string html = await ReadOfficialEventsHtmlWithBrowserAsync(cancellationToken);
			object refreshed = await eventService.RefreshFromRenderedHtmlAsync(html, cancellationToken);
			logger.Info("Events browser fallback succeeded.");
			return refreshed;
		}
		catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
		{
			throw;
		}
		catch (Exception ex)
		{
			logger.Warn("Events browser fallback failed: " + ex.Message);
			return dashboard;
		}
	}

	internal static bool ShouldUseEventsBrowserFallback(object dashboard, bool forceRefresh)
	{
		if (EventDashboardHasStatus(dashboard, "LIVE")
			|| EventDashboardHasStatus(dashboard, "MAINTENANCE"))
			return false;

		// Initialization should paint a usable cache immediately. A user-requested
		// refresh must still try the rendered-browser path when the lightweight
		// request was blocked, even when that failed request returned cached events.
		return forceRefresh || !EventDashboardHasEvents(dashboard);
	}

	private static bool EventDashboardHasStatus(object dashboard, string expectedStatus)
	{
		try
		{
			JsonElement json = JsonSerializer.SerializeToElement(dashboard, JsonOptions);
			return json.TryGetProperty("status", out JsonElement status)
				&& status.ValueKind == JsonValueKind.String
				&& string.Equals(status.GetString(), expectedStatus, StringComparison.OrdinalIgnoreCase);
		}
		catch
		{
			return false;
		}
	}

	private static bool EventDashboardHasEvents(object dashboard)
	{
		try
		{
			JsonElement json = JsonSerializer.SerializeToElement(dashboard, JsonOptions);
			return json.TryGetProperty("totalCount", out JsonElement total)
				&& total.ValueKind == JsonValueKind.Number
				&& total.GetInt32() > 0;
		}
		catch
		{
			return false;
		}
	}

	private async Task<string> ReadOfficialEventsHtmlWithBrowserAsync(CancellationToken cancellationToken)
	{
		using CancellationTokenSource timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
		timeout.CancelAfter(TimeSpan.FromSeconds(55));
		WebView2 browser = await NavigateEventsBrowserWithRetryAsync(EventService.OfficialEventsUrl, timeout.Token);

		string latestHtml = "";
		for (int attempt = 0; attempt < 50; attempt++)
		{
			timeout.Token.ThrowIfCancellationRequested();
			latestHtml = await ReadBrowserHtmlAsync(browser);
			if (await BrowserHasRenderedEventCardsAsync(browser)
				&& LooksLikeOfficialEventsPage(latestHtml))
				return latestHtml;
			if (attempt < 49)
				await Task.Delay(1000, timeout.Token);
		}

		return latestHtml;
	}

	private async Task<WebView2> NavigateEventsBrowserWithRetryAsync(string url, CancellationToken cancellationToken)
	{
		Exception? lastError = null;
		for (int attempt = 1; attempt <= 2; attempt++)
		{
			try
			{
				WebView2 browser = await EnsureEventsBrowserAsync(cancellationToken);
				await NavigateEventsBrowserAsync(browser, url, cancellationToken);
				return browser;
			}
			catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
			{
				throw;
			}
			catch (Exception ex)
			{
				lastError = ex;
				logger.Warn($"Events browser navigation attempt {attempt} failed: {ex.Message}");
				DisposeEventsBrowser();
				if (attempt < 2)
					await Task.Delay(750, cancellationToken);
			}
		}

		throw new InvalidDataException(
			"The official Events page did not finish loading after two browser attempts.",
			lastError);
	}

	private async Task<WebView2> EnsureEventsBrowserAsync(CancellationToken cancellationToken)
	{
		if (eventsBrowserView is { IsDisposed: false, CoreWebView2: not null })
			return eventsBrowserView;

		eventsBrowserView?.Dispose();
		eventsBrowserView = new WebView2
		{
			Location = new Point(-32000, -32000),
			Size = new Size(1, 1),
			TabStop = false,
			Visible = true
		};
		Controls.Add(eventsBrowserView);
		eventsBrowserView.SendToBack();

		string userDataFolder = Path.Combine(paths.WebViewDataPath, "events-page");
		CoreWebView2Environment environment = await CoreWebView2Environment.CreateAsync(null, userDataFolder);
		await eventsBrowserView.EnsureCoreWebView2Async(environment);
		eventsBrowserView.CoreWebView2.Settings.AreDevToolsEnabled = false;
		eventsBrowserView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
		eventsBrowserView.CoreWebView2.Settings.IsStatusBarEnabled = false;
		eventsBrowserView.CoreWebView2.NewWindowRequested += delegate(object? _, CoreWebView2NewWindowRequestedEventArgs args)
		{
			args.Handled = true;
		};
		eventsBrowserView.CoreWebView2.ProcessFailed += OnEventsBrowserProcessFailed;
		cancellationToken.ThrowIfCancellationRequested();
		return eventsBrowserView;
	}

	private void OnEventsBrowserProcessFailed(object? sender, CoreWebView2ProcessFailedEventArgs args)
	{
		logger.Warn(
			$"Events WebView process failed: kind={args.ProcessFailedKind}, "
			+ $"reason={args.Reason}, exit={args.ExitCode}.");
		if (args.ProcessFailedKind is CoreWebView2ProcessFailedKind.UtilityProcessExited
			or CoreWebView2ProcessFailedKind.SandboxHelperProcessExited
			or CoreWebView2ProcessFailedKind.PpapiPluginProcessExited
			or CoreWebView2ProcessFailedKind.PpapiBrokerProcessExited
			or CoreWebView2ProcessFailedKind.FrameRenderProcessExited)
		{
			return;
		}

		WebView2? failedBrowser = eventsBrowserView;
		if (failedBrowser is null)
			return;
		try
		{
			if (sender is not CoreWebView2 failedCore
				|| !ReferenceEquals(failedCore, failedBrowser.CoreWebView2))
			{
				return;
			}
		}
		catch
		{
			return;
		}

		try
		{
			BeginInvoke((Action)(() => DisposeEventsBrowser(failedBrowser)));
		}
		catch (InvalidOperationException)
		{
		}
	}

	private void DisposeEventsBrowser(WebView2? expectedBrowser = null)
	{
		WebView2? browser = eventsBrowserView;
		if (expectedBrowser is not null && !ReferenceEquals(browser, expectedBrowser))
			return;
		eventsBrowserView = null;
		if (browser is null)
			return;
		try
		{
			if (browser.CoreWebView2 is not null)
				browser.CoreWebView2.ProcessFailed -= OnEventsBrowserProcessFailed;
		}
		catch
		{
		}
		try { Controls.Remove(browser); } catch { }
		try { browser.Dispose(); } catch { }
	}

	private static async Task NavigateEventsBrowserAsync(WebView2 browser, string url, CancellationToken cancellationToken)
	{
		TaskCompletionSource navigation = new(TaskCreationOptions.RunContinuationsAsynchronously);
		void Handler(object? _, CoreWebView2NavigationCompletedEventArgs args)
		{
			if (args.IsSuccess)
				navigation.TrySetResult();
			else
				navigation.TrySetException(new InvalidDataException("The official Events page did not finish loading in the hidden browser."));
		}

		browser.CoreWebView2.NavigationCompleted += Handler;
		using CancellationTokenRegistration registration = cancellationToken.Register(() => navigation.TrySetCanceled(cancellationToken));
		try
		{
			browser.CoreWebView2.Navigate(url);
			await navigation.Task;
		}
		finally
		{
			browser.CoreWebView2.NavigationCompleted -= Handler;
		}
	}

	private static async Task<string> ReadBrowserHtmlAsync(WebView2 browser)
	{
		string json = await browser.CoreWebView2.ExecuteScriptAsync("document.documentElement.outerHTML");
		return JsonSerializer.Deserialize<string>(json, JsonOptions) ?? "";
	}

	private static async Task<bool> BrowserHasRenderedEventCardsAsync(WebView2 browser)
	{
		string json = await browser.CoreWebView2.ExecuteScriptAsync(
			"Boolean(document.querySelector('.event_list a[href*=\"groupContentNo=\"]'))");
		return JsonSerializer.Deserialize<bool>(json, JsonOptions);
	}

	internal static bool LooksLikeOfficialEventsPage(string html)
	{
		if (string.IsNullOrWhiteSpace(html))
			return false;
		if (html.Contains("_Incapsula_Resource", StringComparison.OrdinalIgnoreCase)
			|| html.Contains("Incapsula incident", StringComparison.OrdinalIgnoreCase)
			|| html.Contains("Request unsuccessful", StringComparison.OrdinalIgnoreCase))
			return false;

		Match eventList = Regex.Match(
			html,
			"<div\\b[^>]*class=[\"'][^\"']*\\bevent_list\\b[^\"']*[\"'][^>]*>(?<list>[\\s\\S]*?)</ul>",
			RegexOptions.IgnoreCase | RegexOptions.CultureInvariant,
			TimeSpan.FromSeconds(2));
		return eventList.Success
			&& eventList.Groups["list"].Value.Contains("groupContentNo=", StringComparison.OrdinalIgnoreCase);
	}

	private async Task<object> DownloadAndLaunchUpdateInstallerAsync(CancellationToken cancellationToken)
	{
		UpdateCheckResult update = await updateCheckerService.CheckAsync(cancellationToken);
		if (!update.UpdateAvailable)
		{
			return new
			{
				started = false,
				latestVersion = update.LatestVersion,
				message = "You are on the latest version."
			};
		}

		if (!Uri.TryCreate(update.Url, UriKind.Absolute, out Uri? uri)
			|| uri.Scheme != Uri.UriSchemeHttps
			|| !IsAllowedUpdateDownloadHost(uri.Host))
		{
			throw new InvalidOperationException("The update download link is not allowed.");
		}

		if (!uri.AbsolutePath.EndsWith(".exe", StringComparison.OrdinalIgnoreCase))
		{
			throw new InvalidOperationException("The latest release does not include a direct Windows installer download yet.");
		}
		if (string.IsNullOrWhiteSpace(update.Sha256))
		{
			throw new InvalidOperationException("The update is missing its required SHA-256 integrity value. Open the release page instead.");
		}

		string safeVersion = new string(update.LatestVersion.Where(ch => char.IsLetterOrDigit(ch) || ch is '.' or '-' or '_').ToArray());
		if (string.IsNullOrWhiteSpace(safeVersion))
			safeVersion = "latest";

		string directory = Path.Combine(Path.GetTempPath(), "Black-Spirit-Hub-Updates");
		Directory.CreateDirectory(directory);
		string installerPath = Path.Combine(directory, $"Black-Spirit-Hub-Installer-{safeVersion}.exe");
		string partialInstallerPath = installerPath + ".download";

		try
		{
			File.Delete(partialInstallerPath);
			using HttpClient client = new()
			{
				Timeout = TimeSpan.FromMinutes(2)
			};
			client.DefaultRequestHeaders.UserAgent.ParseAdd("Black-Spirit-Hub/" + AppVersion.Current);
			using HttpResponseMessage response = await client.GetAsync(uri, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
			response.EnsureSuccessStatusCode();
			long? expectedLength = response.Content.Headers.ContentLength;
			if (expectedLength > MaxInstallerBytes)
				throw new InvalidOperationException("The update installer is unexpectedly large.");

			await using (Stream input = await response.Content.ReadAsStreamAsync(cancellationToken))
			await using (FileStream output = new FileStream(
				partialInstallerPath,
				FileMode.Create,
				FileAccess.Write,
				FileShare.None,
				81920,
				FileOptions.Asynchronous | FileOptions.SequentialScan))
			{
				await CopyWithLimitAsync(input, output, MaxInstallerBytes, cancellationToken);
			}

			FileInfo downloaded = new FileInfo(partialInstallerPath);
			if (!downloaded.Exists || downloaded.Length < 128 * 1024)
				throw new InvalidOperationException("Downloaded installer was incomplete.");
			if (expectedLength.HasValue && downloaded.Length != expectedLength.Value)
				throw new InvalidOperationException("Downloaded installer size did not match the release asset.");

			await using (FileStream verificationStream = new FileStream(
				partialInstallerPath,
				FileMode.Open,
				FileAccess.Read,
				FileShare.Read,
				81920,
				FileOptions.Asynchronous | FileOptions.SequentialScan))
			{
				string actualSha256 = Convert.ToHexString(await SHA256.HashDataAsync(verificationStream, cancellationToken));
				if (!string.Equals(actualSha256, update.Sha256, StringComparison.OrdinalIgnoreCase))
					throw new InvalidOperationException("Downloaded installer failed its SHA-256 integrity check.");
			}

			File.Move(partialInstallerPath, installerPath, overwrite: true);
		}
		catch
		{
			File.Delete(partialInstallerPath);
			throw;
		}

		ProcessStartInfo installerStart = new ProcessStartInfo(installerPath)
		{
			UseShellExecute = true,
			WorkingDirectory = directory
		};
		string currentInstallDirectory = AppContext.BaseDirectory.TrimEnd(
			Path.DirectorySeparatorChar,
			Path.AltDirectorySeparatorChar);
		installerStart.ArgumentList.Add("/DIR=" + currentInstallDirectory);
		installerStart.ArgumentList.Add("/SOURCEPID=" + Environment.ProcessId);
		installerStart.ArgumentList.Add("/CLOSEAPPLICATIONS");
		installerStart.ArgumentList.Add("/NORESTART");
		Process.Start(installerStart);
		BeginInvoke(new Action(() =>
		{
			ExitForUpdate();
		}));

		return new
		{
			started = true,
			latestVersion = update.LatestVersion,
			installerPath,
			integrityVerified = true
		};
	}

	private static async Task CopyWithLimitAsync(
		Stream input,
		Stream output,
		long maximumBytes,
		CancellationToken cancellationToken)
	{
		byte[] buffer = new byte[81920];
		long total = 0;
		while (true)
		{
			int read = await input.ReadAsync(buffer, cancellationToken);
			if (read == 0)
				break;
			total += read;
			if (total > maximumBytes)
				throw new InvalidDataException("The downloaded file exceeded the allowed size.");
			await output.WriteAsync(buffer.AsMemory(0, read), cancellationToken);
		}
	}

	private static bool IsAllowedExternalHost(string host)
	{
		string[] allowedHosts =
		[
			"payment.naeu.playblackdesert.com",
			"www.naeu.playblackdesert.com",
			"blackdesert.pearlabyss.com",
			"www.blackdesertfoundry.com",
			"bdocodex.com",
			"ko-fi.com",
			"github.com"
		];
		return allowedHosts.Any(x => x.Equals(host, StringComparison.OrdinalIgnoreCase));
	}

	private static bool IsAllowedUpdateDownloadHost(string host)
	{
		string[] allowedHosts =
		[
			"github.com",
			"objects.githubusercontent.com",
			"github-releases.githubusercontent.com"
		];
		return allowedHosts.Any(x => x.Equals(host, StringComparison.OrdinalIgnoreCase))
			|| host.EndsWith(".github.com", StringComparison.OrdinalIgnoreCase);
	}

	[DllImport("user32.dll")]
	private static extern bool ReleaseCapture();

	[DllImport("user32.dll")]
	private static extern nint SendMessage(nint hWnd, int msg, nint wParam, nint lParam);

	private async Task<object> SelectBdoFolderAsync(JsonElement payload, CancellationToken cancellationToken)
	{
		JsonElement value;
		string text = (payload.TryGetProperty("currentPath", out value) ? (value.GetString() ?? "") : "");
		using FolderBrowserDialog dialog = new FolderBrowserDialog
		{
			Description = "Select the main Black Desert Online folder",
			UseDescriptionForTitle = true,
			ShowNewFolderButton = false,
			SelectedPath = (Directory.Exists(text) ? text : FontChangerService.DefaultBdoFolder)
		};
		if (dialog.ShowDialog(this) != DialogResult.OK)
		{
			return new
			{
				cancelled = true
			};
		}
		return new
		{
			cancelled = false,
			bdoFolder = (await fontChangerService.SaveBdoFolderAsync(dialog.SelectedPath, cancellationToken)).BdoFolder
		};
	}

	private async Task<object> SelectCustomFontAsync(JsonElement payload, CancellationToken cancellationToken)
	{
		JsonElement value;
		string path = (payload.TryGetProperty("currentPath", out value) ? (value.GetString() ?? "") : "");
		using OpenFileDialog openFileDialog = new OpenFileDialog
		{
			Title = "Choose a custom TrueType font",
			InitialDirectory = (File.Exists(path) ? Path.GetDirectoryName(path) : Environment.GetFolderPath(Environment.SpecialFolder.Personal)),
			Filter = "TrueType fonts (*.ttf)|*.ttf",
			CheckFileExists = true,
			Multiselect = false
		};
		if (openFileDialog.ShowDialog(this) != DialogResult.OK)
		{
			return new
			{
				cancelled = true
			};
		}
		object font = await Task.Run(() => fontChangerService.DescribeCustomFont(openFileDialog.FileName), cancellationToken);
		return new
		{
			cancelled = false,
			font
		};
	}

	private async Task<object> SelectFaceTextureFolderAsync(JsonElement payload, CancellationToken cancellationToken)
	{
		JsonElement value;
		string text = (payload.TryGetProperty("currentPath", out value) ? (value.GetString() ?? "") : "");
		using FolderBrowserDialog dialog = new FolderBrowserDialog
		{
			Description = "Select the Black Desert Online FaceTexture folder",
			UseDescriptionForTitle = true,
			ShowNewFolderButton = false,
			SelectedPath = (Directory.Exists(text) ? text : PortraitReplacerService.DefaultFaceTextureFolder)
		};
		if (dialog.ShowDialog(this) != DialogResult.OK)
		{
			return new
			{
				cancelled = true
			};
		}
		return new
		{
			cancelled = false,
			faceTextureFolder = (await portraitReplacerService.SaveFaceTextureFolderAsync(dialog.SelectedPath, cancellationToken)).FaceTextureFolder
		};
	}

	private object SelectOldPortrait(JsonElement payload)
	{
		JsonElement value;
		string text = (payload.TryGetProperty("faceTextureFolder", out value) ? (value.GetString() ?? "") : "");
		if (!Directory.Exists(text))
		{
			throw new DirectoryNotFoundException("Select the BDO FaceTexture folder first.");
		}
		using OpenFileDialog openFileDialog = new OpenFileDialog
		{
			Title = "Select the existing BDO portrait",
			InitialDirectory = text,
			Filter = "BDO bitmap portraits (*.bmp)|*.bmp",
			CheckFileExists = true,
			Multiselect = false
		};
		if (openFileDialog.ShowDialog(this) != DialogResult.OK)
		{
			return new
			{
				cancelled = true
			};
		}
		string directoryName = Path.GetDirectoryName(Path.GetFullPath(openFileDialog.FileName));
		string b = Path.GetFullPath(text).TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
		if (!string.Equals(directoryName, b, StringComparison.OrdinalIgnoreCase))
		{
			throw new InvalidDataException("Select the old portrait directly from the chosen FaceTexture folder.");
		}
		object image = portraitReplacerService.DescribeImage(openFileDialog.FileName, renderFinal: false);
		return new
		{
			cancelled = false,
			image = image
		};
	}

	private object SelectNewPortrait(JsonElement payload)
	{
		JsonElement value;
		string path = (payload.TryGetProperty("currentPath", out value) ? (value.GetString() ?? "") : "");
		using OpenFileDialog openFileDialog = new OpenFileDialog
		{
			Title = "Select the new portrait image",
			InitialDirectory = (File.Exists(path) ? Path.GetDirectoryName(path) : Environment.GetFolderPath(Environment.SpecialFolder.MyPictures)),
			Filter = "Supported images (*.png;*.jpg;*.jpeg;*.bmp)|*.png;*.jpg;*.jpeg;*.bmp|PNG images (*.png)|*.png|JPEG images (*.jpg;*.jpeg)|*.jpg;*.jpeg|Bitmap images (*.bmp)|*.bmp",
			CheckFileExists = true,
			Multiselect = false
		};
		if (openFileDialog.ShowDialog(this) != DialogResult.OK)
		{
			return new
			{
				cancelled = true
			};
		}
		object image = portraitReplacerService.DescribeImage(openFileDialog.FileName, renderFinal: false);
		return new
		{
			cancelled = false,
			image = image
		};
	}

	private async Task<object> ExportCsvAsync(MarketAnalyticsService service, CancellationToken cancellationToken)
	{
		using SaveFileDialog dialog = new SaveFileDialog
		{
			Title = "Export Market Analytics",
			Filter = "CSV files (*.csv)|*.csv",
			FileName = $"bdo-market-{service.Settings.Region}-{DateTime.Now:yyyyMMdd-HHmm}.csv",
			AddExtension = true,
			DefaultExt = "csv"
		};
		if (dialog.ShowDialog(this) != DialogResult.OK)
		{
			return new
			{
				cancelled = true
			};
		}
		await service.ExportCsvAsync(dialog.FileName, cancellationToken);
		return new
		{
			cancelled = false,
			path = dialog.FileName
		};
	}

	private void PostResponse(int generation, string? id, bool ok, object? data, string? error)
	{
		if (generation != webViewGeneration)
			return;
		PostJson(new { id, ok, data, error });
	}

	private void PostEvent(string name, object? data)
	{
		PostJson(new
		{
			eventName = name,
			data = data
		});
	}

	private void PostJson(object value)
	{
		if (base.IsDisposed || webViewClosing)
		{
			return;
		}
		if (base.InvokeRequired)
		{
			try
			{
				BeginInvoke(delegate
				{
					PostJson(value);
				});
			}
			catch (InvalidOperationException)
			{
			}
		}
		else
		{
			try
			{
				if (!webView.IsDisposed && webView.CoreWebView2 is not null)
					webView.CoreWebView2.PostWebMessageAsJson(JsonSerializer.Serialize(value, JsonOptions));
			}
			catch (Exception ex) when (ex is InvalidOperationException or COMException)
			{
				logger.Warn("Web message was skipped while the interface was recovering: " + ex.Message);
			}
		}
	}

	private void ShowError(string message)
	{
		startupSplash.ShowError(message);
		if (!webView.IsDisposed)
			webView.Visible = false;
	}

	private bool IsTrustedLocalUi(string value)
	{
		if (!Uri.TryCreate(value, UriKind.Absolute, out Uri result))
		{
			return false;
		}
		if (result.Scheme == Uri.UriSchemeHttps && string.Equals(result.Host, LocalAppHost, StringComparison.OrdinalIgnoreCase))
		{
			return true;
		}
		if (!result.IsFile)
		{
			return false;
		}
		string localPath = Path.GetFullPath(result.LocalPath);
		string htmlPath = Path.GetFullPath(paths.HtmlPath);
		if (string.Equals(localPath, htmlPath, StringComparison.OrdinalIgnoreCase))
		{
			return true;
		}

		string appRoot = Path.GetFullPath(paths.Root).TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar) + Path.DirectorySeparatorChar;
		return localPath.StartsWith(appRoot, StringComparison.OrdinalIgnoreCase);
	}
}


