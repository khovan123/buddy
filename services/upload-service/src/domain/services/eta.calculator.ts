/**
 * ETA (Estimated Time of Arrival) Calculator.
 * Tính toán thời gian dự kiến upload/xử lý dựa trên loại file và dung lượng.
 *
 * Tốc độ mạng giả định (Network Speed): 2 MB/s
 * Tốc độ xử lý video giả định (Transcode Speed): 1.5 giây cho mỗi 1 MB
 */
export class ETACalculator {
  private static readonly NETWORK_SPEED_MBPS = 2; // Giả định tốc độ mạng 2 MB/s
  private static readonly TRANSCODE_TIME_PER_MB = 1.5; // Giả định xử lý mất 1.5s cho mỗi MB video
  private static readonly QUEUE_WAIT_TIME_PER_JOB = 5; // Giả định mỗi job trong hàng đợi gây trễ 5s

  /**
   * Tính ETA cho Resource (chỉ upload, không xử lý qua FFmpeg)
   * Formula: ETA = ceil(fileSizeMB / NetworkSpeed)
   *
   * @param fileSizeBytes - Kích thước file tính bằng bytes
   * @returns ETA tính bằng giây
   */
  static calculateResourceETA(fileSizeBytes: number): number {
    const fileSizeMB = fileSizeBytes / (1024 * 1024);
    const estimatedTime = Math.ceil(fileSizeMB / this.NETWORK_SPEED_MBPS);
    return estimatedTime;
  }

  /**
   * Tính ETA cho Tutorial (upload + transcode + queue wait)
   * Formula: ETA = T_upload + T_transcode + T_queue
   * Trong đó T_transcode được tính dựa trên dung lượng thay vì duration.
   *
   * @param fileSizeBytes - Kích thước file tính bằng bytes
   * @param queueLength - Số lượng job đang chờ trong queue (mặc định 0)
   * @returns ETA tính bằng giây
   */
  static calculateTutorialETA(fileSizeBytes: number, queueLength: number = 0): number {
    const fileSizeMB = fileSizeBytes / (1024 * 1024);

    // 1. Thời gian Client upload lên S3
    const t_upload = Math.ceil(fileSizeMB / this.NETWORK_SPEED_MBPS);

    // 2. Thời gian Worker xử lý (Transcode/HLS) dựa trên dung lượng MB
    const t_transcode = Math.ceil(fileSizeMB * this.TRANSCODE_TIME_PER_MB);

    // 3. Thời gian chờ trong hàng đợi RabbitMQ
    const t_queue = queueLength * this.QUEUE_WAIT_TIME_PER_JOB;

    // Tổng thời gian dự kiến
    const totalETA = t_upload + t_transcode + t_queue;

    return totalETA;
  }
}
