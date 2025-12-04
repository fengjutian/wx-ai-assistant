import React from 'react';
import styles from './webview.module.css';

type Props = {
  isElectron: boolean;
  webviewRef: React.RefObject<Electron.WebviewTag | HTMLIFrameElement>;
  webviewSrc: string;
  leftWidth: number;
  renderUrlInput?: () => React.ReactNode;
};

const WebviewPanel: React.FC<Props> = ({
  isElectron,
  webviewRef,
  webviewSrc,
  leftWidth,
  renderUrlInput,
}) => {
  return (
    <div
      id="left"
      className={styles.leftPanel}
      style={{ width: `${leftWidth}%` }}
    >
      {renderUrlInput?.()}
      {isElectron ? (
        <webview
          ref={webviewRef as any}
          id="webview"
          src={webviewSrc}
          className={styles.webview}
          partition="persist:webview"
        />
      ) : (
        <iframe
          ref={webviewRef as any}
          id="webview"
          src={webviewSrc}
          className={styles.iframe}
        />
      )}
    </div>
  );
};

export default WebviewPanel;
