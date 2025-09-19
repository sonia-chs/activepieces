import { useMutation } from '@tanstack/react-query';
import {
  ActivepiecesClientAuthenticationFailed,
  ActivepiecesClientAuthenticationSuccess,
  ActivepiecesClientConfigurationFinished,
  ActivepiecesClientEventName,
  ActivepiecesClientInit,
  ActivepiecesVendorEventName,
  ActivepiecesVendorInit,
  ActivepiecesVendorRouteChanged,
} from 'ee-embed-sdk';
import React from 'react';
import { flushSync } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useEffectOnce } from 'react-use';

import { memoryRouter } from '@/app/router';
import { useEmbedding } from '@/components/embed-provider';
import { useTheme } from '@/components/theme-provider';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { authenticationSession } from '@/lib/authentication-session';
import { managedAuthApi } from '@/lib/managed-auth-api';
import { combinePaths, parentWindow } from '@/lib/utils';

const notifyVendorPostAuthentication = () => {
  const authenticationSuccessEvent: ActivepiecesClientAuthenticationSuccess = {
    type: ActivepiecesClientEventName.CLIENT_AUTHENTICATION_SUCCESS,
    data: {},
  };
  parentWindow.postMessage(authenticationSuccessEvent, '*');
  const configurationFinishedEvent: ActivepiecesClientConfigurationFinished = {
    type: ActivepiecesClientEventName.CLIENT_CONFIGURATION_FINISHED,
    data: {},
  };
  parentWindow.postMessage(configurationFinishedEvent, '*');
};

const handleVendorNavigation = ({ projectId }: { projectId: string }) => {
  const handleVendorRouteChange = (
    event: MessageEvent<ActivepiecesVendorRouteChanged>,
  ) => {
    if (
      event.source === parentWindow &&
      event.data.type === ActivepiecesVendorEventName.VENDOR_ROUTE_CHANGED
    ) {
      const targetRoute = event.data.data.vendorRoute;
      const targetRouteRequiresProjectId =
        targetRoute.includes('/runs') ||
        targetRoute.includes('/flows') ||
        targetRoute.includes('/connections');
      if (!targetRouteRequiresProjectId) {
        memoryRouter.navigate(targetRoute);
      } else {
        memoryRouter.navigate(
          combinePaths({
            secondPath: targetRoute,
            firstPath: `/projects/${projectId}`,
          }),
        );
      }
    }
  };
  window.addEventListener('message', handleVendorRouteChange);
};

const handleClientNavigation = () => {
  memoryRouter.subscribe((state) => {
    const pathNameWithoutProjectOrProjectId = state.location.pathname.replace(
      /\/projects\/[^/]+/,
      '',
    );
    parentWindow.postMessage(
      {
        type: ActivepiecesClientEventName.CLIENT_ROUTE_CHANGED,
        data: {
          route: pathNameWithoutProjectOrProjectId + state.location.search,
        },
      },
      '*',
    );
  });
};

const EmbedPage = React.memo(() => {
  const { setEmbedState, embedState } = useEmbedding();
  const { mutateAsync } = useMutation({
    mutationFn: async ({
      externalAccessToken,
      locale,
    }: {
      externalAccessToken: string;
      locale: string;
    }) => {
      const data = await managedAuthApi.generateApToken({
        externalAccessToken,
      });
      await i18n.changeLanguage(locale);
      return data;
    },
  });
  const { setTheme } = useTheme();
  const { i18n } = useTranslation();
  // Helper to parse boolean-like query params
  const parseBool = (value: string | null | undefined) =>
    value === 'true' || value === '1' || value === 'yes';
  const initState = (event: MessageEvent<ActivepiecesVendorInit>) => {
    if (
      event.source === parentWindow &&
      event.data.type === ActivepiecesVendorEventName.VENDOR_INIT
    ) {
      if (event.data.data.jwtToken) {
        if (event.data.data.mode) {
          setTheme(event.data.data.mode);
        }
        mutateAsync(
          {
            externalAccessToken: event.data.data.jwtToken,
            locale: event.data.data.locale ?? 'en',
          },
          {
            onSuccess: (data) => {
              authenticationSession.saveResponse(data, true);
              const initialRoute = event.data.data.initialRoute ?? '/';
              //must use it to ensure that the correct router in RouterProvider is used before navigation
              flushSync(() => {
                setEmbedState({
                  hideSideNav: event.data.data.hideSidebar,
                  isEmbedded: true,
                  hideFlowNameInBuilder:
                    event.data.data.hideFlowNameInBuilder ?? false,
                  disableNavigationInBuilder:
                    event.data.data.disableNavigationInBuilder !== false,
                  hideFolders: event.data.data.hideFolders ?? false,
                  sdkVersion: event.data.data.sdkVersion,
                  fontUrl: event.data.data.fontUrl,
                  fontFamily: event.data.data.fontFamily,
                  useDarkBackground:
                    initialRoute.startsWith('/embed/connections'),
                  hideExportAndImportFlow:
                    event.data.data.hideExportAndImportFlow ?? false,
                  hideHomeButtonInBuilder:
                    event.data.data.disableNavigationInBuilder ===
                    'keep_home_button_only'
                      ? false
                      : event.data.data.disableNavigationInBuilder,
                  emitHomeButtonClickedEvent:
                    event.data.data.emitHomeButtonClickedEvent ?? false,
                  homeButtonIcon: event.data.data.homeButtonIcon ?? 'logo',
                  hideDuplicateFlow: event.data.data.hideDuplicateFlow ?? false,
                  hideFlowsPageNavbar:
                    event.data.data.hideFlowsPageNavbar ?? false,
                  hideProjectSettings:
                    event.data.data.hideProjectSettings ?? false,
                });
              });
              memoryRouter.navigate(initialRoute);
              handleVendorNavigation({ projectId: data.projectId });
              handleClientNavigation();
              notifyVendorPostAuthentication();
            },
            onError: (error) => {
              const errorEvent: ActivepiecesClientAuthenticationFailed = {
                type: ActivepiecesClientEventName.CLIENT_AUTHENTICATION_FAILED,
                data: error,
              };
              parentWindow.postMessage(errorEvent, '*');
            },
          },
        );
      } else {
        console.error('Token sent via the sdk is empty');
      }
    }
  };

  useEffectOnce(() => {
    // If query params are provided, allow embedding without the SDK
    const search = new URLSearchParams(window.location.search);
    const externalToken = search.get('externalToken');
    const apToken = search.get('apToken');
    const locale = search.get('locale') ?? 'en';
    const initialRoute = search.get('route') ?? '/flows';
    const mode = search.get('mode');
    const hideSidebar = parseBool(search.get('hideSidebar'));
    const hideFlowsPageNavbar = parseBool(search.get('hideFlowsPageNavbar'));
    const hideFolders = parseBool(search.get('hideFolders'));
    const hideExportAndImportFlow = parseBool(
      search.get('hideExportAndImportFlow'),
    );
    const hideDuplicateFlow = parseBool(search.get('hideDuplicateFlow'));
    const hideProjectSettings = parseBool(search.get('hideProjectSettings'));
    const hideFlowNameInBuilder = parseBool(
      search.get('hideFlowNameInBuilder'),
    );
    const disableNavigationInBuilderRaw = search.get(
      'disableNavigationInBuilder',
    );
    const disableNavigationInBuilder =
      disableNavigationInBuilderRaw === 'keep_home_button_only'
        ? ('keep_home_button_only' as const)
        : parseBool(disableNavigationInBuilderRaw ?? '') || undefined;
    const emitHomeButtonClickedEvent = parseBool(
      search.get('emitHomeButtonClickedEvent'),
    );
    const homeButtonIcon =
      (search.get('homeButtonIcon') as 'back' | 'logo' | null) ?? 'logo';
    const fontUrl = search.get('fontUrl') ?? undefined;
    const fontFamily = search.get('fontFamily') ?? undefined;
    const hideTutorials = parseBool(search.get('hideTutorials'));
    const hideLogo = parseBool(search.get('hideLogo'));
    const primaryColor = search.get('primaryColor') ?? undefined;
    const primaryColorLight = search.get('primaryColorLight') ?? undefined;
    const primaryColorDark = search.get('primaryColorDark') ?? undefined;

    // If either externalToken or apToken provided, use URL-based init
    if (externalToken || apToken) {
      if (mode) {
        setTheme(mode as 'light' | 'dark');
      }
      const applyEmbedFlags = () => {
        //must use it to ensure that the correct router in RouterProvider is used before navigation
        flushSync(() => {
          setEmbedState({
            hideSideNav: hideSidebar,
            isEmbedded: true,
            hideFlowNameInBuilder: hideFlowNameInBuilder ?? false,
            disableNavigationInBuilder:
              disableNavigationInBuilder === 'keep_home_button_only'
                ? (false as unknown as boolean)
                : (disableNavigationInBuilder as boolean) ?? true,
            hideFolders: hideFolders ?? false,
            sdkVersion: undefined,
            fontUrl,
            fontFamily,
            useDarkBackground: initialRoute.startsWith('/embed/connections'),
            hideExportAndImportFlow: hideExportAndImportFlow ?? false,
            hideHomeButtonInBuilder:
              disableNavigationInBuilder === 'keep_home_button_only'
                ? false
                : (disableNavigationInBuilder as boolean) ?? true,
            emitHomeButtonClickedEvent: emitHomeButtonClickedEvent ?? false,
            homeButtonIcon: homeButtonIcon ?? 'logo',
            hideDuplicateFlow: hideDuplicateFlow ?? false,
            hideFlowsPageNavbar: hideFlowsPageNavbar ?? false,
            hideProjectSettings: hideProjectSettings ?? false,
            hideTutorials: hideTutorials ?? false,
            hideLogo: hideLogo ?? false,
          });
        });
      };
      const finish = () => {
        // Preserve query params (e.g., hideSidebar) after navigating
        memoryRouter.navigate(`${initialRoute}${window.location.search}`);
        handleClientNavigation();
      };

      // Apply primary color overrides if provided
      if (primaryColor) {
        try {
          const root = document.documentElement;
          const hexToHslString = (hex: string) => {
            let h = hex.replace(/^#/, '');
            if (h.length === 3)
              h = h
                .split('')
                .map((c) => c + c)
                .join('');
            const r = parseInt(h.substring(0, 2), 16) / 255;
            const g = parseInt(h.substring(2, 4), 16) / 255;
            const b = parseInt(h.substring(4, 6), 16) / 255;
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const l = (max + min) / 2;
            let hDeg = 0;
            let s = 0;
            if (max !== min) {
              const d = max - min;
              s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
              switch (max) {
                case r:
                  hDeg = (g - b) / d + (g < b ? 6 : 0);
                  break;
                case g:
                  hDeg = (b - r) / d + 2;
                  break;
                default:
                  hDeg = (r - g) / d + 4;
              }
              hDeg /= 6;
            }
            hDeg = hDeg * 360;
            return `${hDeg.toFixed(1)} ${(s * 100).toFixed(1)}% ${(
              l * 100
            ).toFixed(1)}%`;
          };
          const normalize = (value: string) =>
            value.startsWith('#')
              ? hexToHslString(value)
              : value.replace(/^hsl\(|\)$/g, '');
          const setVar = (name: string, value?: string) => {
            if (value)
              root.style.setProperty(name, normalize(value), 'important');
          };
          setVar('--primary', primaryColor);
          setVar('--primary-100', primaryColorLight ?? primaryColor);
          setVar('--primary-300', primaryColorDark ?? primaryColor);
        } catch (e) {
          console.warn('Failed to apply primaryColor overrides', e);
        }
      }

      if (externalToken) {
        mutateAsync(
          { externalAccessToken: externalToken, locale },
          {
            onSuccess: (data) => {
              authenticationSession.saveResponse(data, true);
              applyEmbedFlags();
              finish();
            },
          },
        );
      } else if (apToken) {
        // Direct AP token provided; store it and proceed
        authenticationSession.saveResponse(
          { token: apToken, projectId: '' } as unknown as any,
          true,
        );
        applyEmbedFlags();
        finish();
      }
      return;
    }

    // Fallback to SDK-based initialization via postMessage
    const event: ActivepiecesClientInit = {
      type: ActivepiecesClientEventName.CLIENT_INIT,
      data: {},
    };
    parentWindow.postMessage(event, '*');
    window.addEventListener('message', initState);
    return () => {
      window.removeEventListener('message', initState);
    };
  });
  return <LoadingScreen brightSpinner={embedState.useDarkBackground} />;
});

EmbedPage.displayName = 'EmbedPage';
export { EmbedPage };
