#include <math.h>
#include <stdlib.h>

void cosine_similarity_matrix(
    float *embeddings,  // [N x D] flattened
    float *result,      // [N x N] output
    int N, int D
) {
    #pragma acc data copyin(embeddings[0:N*D]) copyout(result[0:N*N])
    {
        #pragma acc parallel loop collapse(2)
        for (int i = 0; i < N; i++) {
            for (int j = 0; j < N; j++) {
                float dot = 0.0f, norm_i = 0.0f, norm_j = 0.0f;

                #pragma acc loop reduction(+:dot,norm_i,norm_j)
                for (int k = 0; k < D; k++) {
                    float a = embeddings[i * D + k];
                    float b = embeddings[j * D + k];
                    dot    += a * b;
                    norm_i += a * a;
                    norm_j += b * b;
                }
                result[i * N + j] = dot / (sqrtf(norm_i) * sqrtf(norm_j) + 1e-8f);
            }
        }
    }
}
